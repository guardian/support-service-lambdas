/**
 * Creates or updates the Zuora scheduled event, callout template and notification definition that
 * send billing date callouts to this API. Safe to re-run: existing objects are found by name and updated.
 *
 * Usage: STAGE=CODE CALLOUT_API_KEY=... [RUN_AT=HH:MM] pnpm configure-zuora [--apply] [--active]
 *   RUN_AT    run time in the Zuora tenant time zone, e.g. for a one-off test (default 03:00)
 *   ZUORA_CLIENT_ID, ZUORA_CLIENT_SECRET
 *             a Zuora OAuth client with Events & Notifications permissions. If unset, the shared
 *             support-service-lambdas credentials are used, which only have them in CODE.
 *   --apply   make the changes (otherwise only prints them)
 *   --active  switch the callouts on (otherwise they are created or left inactive)
 */
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraBearerTokenProvider } from '@modules/zuora/auth';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

const eventName = 'EmailRemindersBillingDate';
const calloutTemplateName = 'email-reminders billing date callout';
const notificationDefinitionName = 'email-reminders billing date';
const description =
	'Managed by handlers/email-reminders/runManual/configureZuora.ts';

const daysBeforeBillingDate = 14;
const defaultRunAt = '03:00';

// Only subscription and account fields: filtering on charge fields would drop some of a subscription's charges
const filterCondition =
	"Subscription.Status == 'Active' && Subscription.AutoRenew == true && SoldToContact.Country == 'United Kingdom'";

const calloutBody = {
	subscriptionNumber: '{{DataSource.Subscription.Name}}',
	accountNumber: '{{DataSource.Account.AccountNumber}}',
	chargeNumber: '{{DataSource.RatePlanCharge.ChargeNumber}}',
	chargedThroughDate: '{{DataSource.RatePlanCharge.ChargedThroughDate}}',
};

const calloutUrl = (stage: string) =>
	`https://email-reminders${stage === 'PROD' ? '' : '-' + stage.toLowerCase()}.support.guardianapis.com/zuora-callouts/billing-date`;

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

const redact = (body: object) =>
	JSON.stringify(body, (key, value: unknown) =>
		key === 'x-api-key' ? '<redacted>' : value,
	);

// ZuoraClient logs full request bodies, which include the key in the callout template headers
function redactFromConsole(secrets: string[]) {
	const wrap =
		(write: (...args: unknown[]) => void) =>
		(...args: unknown[]) =>
			write(
				...args.map((arg) =>
					typeof arg === 'string'
						? secrets.reduce(
								(text, secret) => text.replaceAll(secret, '<redacted>'),
								arg,
							)
						: arg,
				),
			);
	console.log = wrap(console.log.bind(console));
	console.error = wrap(console.error.bind(console));
}

async function createOrUpdate(
	zuoraClient: ZuoraClient,
	apply: boolean,
	{
		path,
		name,
		createBody,
		updateBody,
	}: {
		path: string;
		name: string;
		createBody: object;
		updateBody: object;
	},
): Promise<string | undefined> {
	const existingId = await findByName(zuoraClient, path, name);
	const action = existingId ? `PUT ${path}/${existingId}` : `POST ${path}`;
	const body = existingId ? updateBody : createBody;
	logger.log(`${apply ? '' : '[dry run] '}${action} ${redact(body)}`);
	if (!apply) {
		return existingId;
	}
	const result = existingId
		? await zuoraClient.put(
				`${path}/${existingId}`,
				JSON.stringify(body),
				idSchema,
			)
		: await zuoraClient.post(path, JSON.stringify(body), idSchema);
	return result.id;
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
	redactFromConsole([apiKey, ...(clientSecret ? [clientSecret] : [])]);

	const runAt = /^(\d{1,2}):(\d{2})$/.exec(process.env.RUN_AT ?? defaultRunAt);
	if (!runAt) {
		throw new Error('RUN_AT must be HH:MM');
	}

	const zuoraClient =
		clientId && clientSecret
			? new ZuoraClient(
					new ZuoraBearerTokenProvider(stage, { clientId, clientSecret }),
				)
			: await ZuoraClient.create(stage);

	const schedule = {
		displayName: 'email-reminders: charge billing date',
		description,
		hours: Number(runAt[1]),
		minutes: Number(runAt[2]),
		active,
	};
	await createOrUpdate(zuoraClient, apply, {
		path: '/events/scheduled-events',
		name: eventName,
		createBody: {
			name: eventName,
			apiObject: 'RatePlanCharge',
			apiField: 'ChargedThroughDate',
			...schedule,
		},
		updateBody: schedule,
	});

	const calloutTemplate = {
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
	};
	const calloutTemplateId = await createOrUpdate(zuoraClient, apply, {
		path: '/notifications/callout-templates',
		name: calloutTemplateName,
		createBody: {
			...calloutTemplate,
			eventTypeName: eventName,
			eventTypeNamespace: 'user.notification',
		},
		updateBody: calloutTemplate,
	});

	const notificationDefinition = {
		name: notificationDefinitionName,
		description,
		active,
		emailActive: false,
		calloutActive: true,
		calloutTemplateIds: [calloutTemplateId ?? '<new callout template id>'],
		filterRule: {
			condition: filterCondition,
		},
		filterRuleParams: {
			_DAYS: String(daysBeforeBillingDate),
			_CONDITION: 'Before',
		},
	};
	await createOrUpdate(zuoraClient, apply, {
		path: '/notifications/notification-definitions',
		name: notificationDefinitionName,
		createBody: {
			...notificationDefinition,
			eventTypeName: eventName,
			eventTypeNamespace: 'user.notification',
		},
		updateBody: notificationDefinition,
	});
}

main().catch((error: unknown) => {
	logger.error(error);
	process.exitCode = 1;
});
