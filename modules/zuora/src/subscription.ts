import type { Dayjs } from 'dayjs';
import type { ZuoraSubscription } from './types';
import { zuoraSubscriptionResponseSchema } from './types';
import { zuoraResponseSchema } from './types';
import type { ZuoraResponse } from './types';
import { zuoraSubscriptionsFromAccountSchema } from './types';
import type { ZuoraSubscriptionsFromAccountResponse } from './types';
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
): Promise<ZuoraResponse> => {
	const path = `/v1/subscriptions/${subscriptionNumber}/cancel`;
	const requestBody: any = {
		cancellationPolicy,
		runBilling,
	};

	// Only include cancellationEffectiveDate for SpecificDate policy
	if (cancellationPolicy === 'SpecificDate') {
		requestBody.cancellationEffectiveDate = zuoraDateFormat(
			contractEffectiveDate,
		);
	}

	// Only include collect if it's not undefined
	if (collect !== undefined) {
		requestBody.collect = collect;
	}

	const body = JSON.stringify(requestBody);
	return zuoraClient.put(path, body, zuoraResponseSchema, {
		'zuora-version': '211.0',
	});
};

export const getSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
): Promise<ZuoraSubscription> => {
	const path = `v1/subscriptions/${subscriptionNumber}`;
	return zuoraClient.get(path, zuoraSubscriptionResponseSchema);
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
	fields: Record<string, any>,
): Promise<ZuoraResponse> => {
	const path = `v1/subscriptions/${subscriptionNumber}`;
	const body = JSON.stringify(fields);
	return zuoraClient.put(path, body, zuoraResponseSchema);
};
