import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import type { CancelSubscriptionResponse, ZuoraSubscription } from './types';
import {
	cancelSubscriptionResponseSchema,
	voidSchema,
	zuoraSubscriptionSchema,
} from './types';
import { zuoraDateFormat } from './utils';
import type { ZuoraClient } from './zuoraClient';

export const cancelSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	contractEffectiveDate: Dayjs,
	runBilling: boolean,
	collect: boolean | undefined = undefined,
	cancellationPolicy:
		| 'SpecificDate'
		| 'EndOfLastInvoicePeriod' = 'SpecificDate',
): Promise<CancelSubscriptionResponse> => {
	const path = `/v1/subscriptions/${subscriptionNumber}/cancel`;

	// Only include cancellationEffectiveDate for SpecificDate policy
	const cancellationEffectiveDate =
		cancellationPolicy === 'SpecificDate'
			? {
					cancellationEffectiveDate: zuoraDateFormat(contractEffectiveDate),
				}
			: undefined;

	// Only include collect if it's not undefined
	const collectField = collect !== undefined ? { collect: collect } : undefined;

	const requestBody = {
		cancellationPolicy,
		runBilling,
		...cancellationEffectiveDate,
		...collectField,
	};

	const body = JSON.stringify(requestBody);
	return zuoraClient.put(path, body, cancelSubscriptionResponseSchema, {
		'zuora-version': '211.0',
	});
};

export async function getSubscription(
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
): Promise<ZuoraSubscription>;
export async function getSubscription<T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	schema: T,
): Promise<z.infer<T>>;
export async function getSubscription<T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	schema?: T,
): Promise<ZuoraSubscription | z.infer<T>> {
	const path = `v1/subscriptions/${subscriptionNumber}`;
	if (schema === undefined) {
		return zuoraClient.get(path, zuoraSubscriptionSchema);
	}
	return zuoraClient.get(path, schema);
}

export async function getSubscriptionsByAccountNumber(
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<ZuoraSubscription[]>;
export async function getSubscriptionsByAccountNumber<T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	accountNumber: string,
	schema: T,
): Promise<Array<z.infer<T>>>;
export async function getSubscriptionsByAccountNumber<T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	accountNumber: string,
	schema?: T,
): Promise<ZuoraSubscription[] | Array<z.infer<T>>> {
	return schema === undefined
		? await allPagesOfSubscriptions(
				zuoraClient,
				accountNumber,
				zuoraSubscriptionSchema,
			)
		: await allPagesOfSubscriptions(zuoraClient, accountNumber, schema);
}

/**
 * Reads every page of an account's subscriptions.
 *
 * Zuora pages this endpoint at 20 and hands back a nextPage when there are more,
 * so a single call can quietly return a partial list. A caller reasoning about
 * what an account does NOT have needs all of it, otherwise a truncated response
 * reads as an absence.
 */
async function allPagesOfSubscriptions<T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	accountNumber: string,
	schema: T,
): Promise<Array<z.infer<T>>> {
	const pageSchema = z.object({
		subscriptions: z.array(schema).optional(),
		nextPage: z.string().optional(),
	});

	type Page = { subscriptions?: Array<z.infer<T>>; nextPage?: string };

	const subscriptions: Array<z.infer<T>> = [];
	let path: string | undefined = `v1/subscriptions/accounts/${accountNumber}`;

	while (path !== undefined) {
		const page: Page = await zuoraClient.get(path, pageSchema);
		subscriptions.push(...(page.subscriptions ?? []));
		path = page.nextPage?.replace(/^\//, '');
	}

	return subscriptions;
}

export const updateSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	fields: Record<string, string | number | boolean>,
): Promise<void> => {
	const path = `v1/subscriptions/${subscriptionNumber}`;
	const body = JSON.stringify(fields);
	await zuoraClient.put(path, body, voidSchema);
};
