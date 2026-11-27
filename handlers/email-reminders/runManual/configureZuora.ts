/**
 * Creates or updates the Zuora scheduled event, callout template and notification definition that
 * send billing date callouts to this API. Safe to re-run: existing objects are found by name and updated.
 *
 * Usage: STAGE=CODE CALLOUT_API_KEY=... pnpm configure-zuora [--apply] [--active]
 *   ZUORA_CLIENT_ID, ZUORA_CLIENT_SECRET
 *             a Zuora OAuth client with Events & Notifications permissions. If unset, the shared
 *             support-service-lambdas credentials are used, which only have them in CODE.
 *   --apply   make the changes (otherwise only prints them)
 *   --active  switch the callouts on (otherwise they are created or left inactive)
 */
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraBearerTokenProvider } from '@modules/zuora/auth';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

const eventName = 'EmailRemindersBillingDate';
const calloutTemplateName = 'email-reminders billing date callout';
const notificationDefinitionName = 'email-reminders billing date';
const description =
	'Managed by handlers/email-reminders/runManual/configureZuora.ts';

const daysBeforeBillingDate = 14;
// daily run time in the Zuora tenant time zone
const runAt = { hours: 3, minutes: 0 };

// Only subscription and account fields: filtering on charge fields would drop some of a subscription's charges
const filterCondition =
	"Subscription.Status == 'Active' && Subscription.AutoRenew == true && SoldToContact.Country == 'United Kingdom'";

const calloutBody = {
	subscriptionNumber: '{{DataSource.Subscription.Name}}',
	accountNumber: '{{DataSource.Account.AccountNumber}}',
	chargeNumber: '{{DataSource.RatePlanCharge.ChargeNumber}}',
	chargedThroughDate: '{{DataSource.RatePlanCharge.ChargedThroughDate}}',
};

const calloutUrl = (stage: Stage) =>
	`https://email-reminders${stage === 'PROD' ? '' : '-' + stage.toLowerCase()}.support.guardianapis.com/`;

type Upsert = (
	name: string,
	body: object,
	createOnly: object,
) => Promise<string | undefined>;

// Fires daily for each charge whose ChargedThroughDate (the next billing date) is in the notification's window
function upsertEvent(upsert: Upsert, active: boolean) {
	return upsert(
		eventName,
		{
			displayName: 'email-reminders: charge billing date',
			description,
			...runAt,
			active,
		},
		{
			name: eventName,
			apiObject: 'RatePlanCharge',
			apiField: 'ChargedThroughDate',
		},
	);
}

function upsertTemplate(upsert: Upsert, stage: Stage, apiKey: string) {
	return upsert(
		calloutTemplateName,
		{
			name: calloutTemplateName,
			description,
			active: true,
			calloutBaseurl: calloutUrl(stage),
			httpMethod: 'POST',
			calloutHeaders: { 'x-api-key': apiKey },
			calloutRetry: true,
			contentType: 'APPLICATION_JSON',
			useCustomRequestBody: true,
			customRequestBody: JSON.stringify(calloutBody),
		},
		{ eventTypeName: eventName, eventTypeNamespace: 'user.notification' },
	);
}

function upsertNotification(
	upsert: Upsert,
	active: boolean,
	calloutTemplateId: string | undefined,
) {
	return upsert(
		notificationDefinitionName,
		{
			name: notificationDefinitionName,
			description,
			active,
			emailActive: false,
			calloutActive: true,
			calloutTemplateIds: [calloutTemplateId ?? '<new callout template id>'],
			filterRule: { condition: filterCondition },
			filterRuleParams: {
				_DAYS: String(daysBeforeBillingDate),
				_CONDITION: 'Before',
			},
		},
		{ eventTypeName: eventName, eventTypeNamespace: 'user.notification' },
	);
}

async function main() {
	const stage = stageFromEnvironment();
	const apply = process.argv.includes('--apply');
	const active = process.argv.includes('--active');
	const apiKey = process.env.CALLOUT_API_KEY;
	if (!apiKey) {
		throw new Error('set CALLOUT_API_KEY to the email-reminders API key');
	}
	const clientId = process.env.ZUORA_CLIENT_ID;
	const clientSecret = process.env.ZUORA_CLIENT_SECRET;
	const zuoraClient =
		clientId && clientSecret
			? new ZuoraClient(
					new ZuoraBearerTokenProvider(stage, { clientId, clientSecret }),
				)
			: await ZuoraClient.create(stage);

	const upsertAt =
		(path: string): Upsert =>
		(name, body, createOnly) =>
			createOrUpdate(zuoraClient, apply, path, name, body, createOnly);

	await upsertEvent(upsertAt('/events/scheduled-events'), active);
	const calloutTemplateId = await upsertTemplate(
		upsertAt('/notifications/callout-templates'),
		stage,
		apiKey,
	);
	await upsertNotification(
		upsertAt('/notifications/notification-definitions'),
		active,
		calloutTemplateId,
	);
}

const namedObjectSchema = z.object({ id: z.string(), name: z.string() });
const pageSchema = z.object({
	data: z.array(namedObjectSchema),
	next: z.string().nullish(),
});
const idSchema = z.object({ id: z.string() });

async function findByName(
	zuoraClient: ZuoraClient,
	path: string,
	name: string,
): Promise<string | undefined> {
	let next: string | null | undefined = `${path}?pageSize=100`;
	while (next) {
		const page: z.infer<typeof pageSchema> = await zuoraClient.get(
			next,
			pageSchema,
		);
		const match = page.data.find((item) => item.name === name);
		if (match) {
			return match.id;
		}
		next = page.next;
	}
	return undefined;
}

// Updates the object with this name if it exists, otherwise creates it with createOnly fields added
async function createOrUpdate(
	zuoraClient: ZuoraClient,
	apply: boolean,
	path: string,
	name: string,
	body: object,
	createOnly: object,
): Promise<string | undefined> {
	const existingId = await findByName(zuoraClient, path, name);
	const [action, requestBody] = existingId
		? [`PUT ${path}/${existingId}`, body]
		: [`POST ${path}`, { ...body, ...createOnly }];
	logger.log(
		`${apply ? '' : '[dry run] '}${action} ${JSON.stringify(requestBody)}`,
	);
	if (!apply) {
		return existingId;
	}
	const result = existingId
		? await zuoraClient.put(
				`${path}/${existingId}`,
				JSON.stringify(requestBody),
				idSchema,
			)
		: await zuoraClient.post(path, JSON.stringify(requestBody), idSchema);
	return result.id;
}

main().catch((error: unknown) => {
	logger.error(error);
	process.exitCode = 1;
});
