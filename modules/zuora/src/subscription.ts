import type { Dayjs } from 'dayjs';
import type { z } from 'zod';
import type {
	ZuoraSubscription,
	ZuoraSubscriptionsFromAccountResponse,
} from './types';
import {
	voidSchema,
	zuoraSubscriptionSchema,
	zuoraSubscriptionsFromAccountSchema,
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
): Promise<void> => {
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
	await zuoraClient.put(path, body, voidSchema, {
		'zuora-version': '211.0',
	});
};

// TODO:delete comment - Fixes type incompatibility by using a single generic for output type
export const getSubscription = async <
	T extends z.ZodType = typeof zuoraSubscriptionSchema,
>(
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const path = `v1/subscriptions/${subscriptionNumber}`;
	const finalSchema = schema ?? zuoraSubscriptionSchema;
	return zuoraClient.get(path, finalSchema);
};

export const getSubscriptionsByAccountNumber = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<ZuoraSubscription[]> => {
	const path = `v1/subscriptions/accounts/${accountNumber}`;
	const response: ZuoraSubscriptionsFromAccountResponse = await zuoraClient.get(
		path,
		zuoraSubscriptionsFromAccountSchema,
	);
	return response.subscriptions ?? [];
};

export const updateSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	fields: Record<string, string | number | boolean>,
): Promise<void> => {
	const path = `v1/subscriptions/${subscriptionNumber}`;
	const body = JSON.stringify(fields);
	await zuoraClient.put(path, body, voidSchema);
};
