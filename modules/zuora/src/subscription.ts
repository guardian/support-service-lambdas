import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from './utils/common';
import type { ZuoraClient } from './zuoraClient';
import type {
	ZuoraSubscription,
	ZuoraSubscriptionsFromAccountResponse,
} from './zuoraSchemas';
import {
	zuoraSubscriptionResponseSchema,
	zuoraSubscriptionsFromAccountSchema,
} from './zuoraSchemas';
import { zuoraResponseSchema } from './types/httpResponse';
import type { ZuoraResponse } from './types/httpResponse';

export const cancelSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	contractEffectiveDate: Dayjs,
	runBilling: boolean,
	collect: boolean | undefined = undefined,
): Promise<ZuoraResponse> => {
	const path = `/v1/subscriptions/${subscriptionNumber}/cancel`;
	const body = JSON.stringify({
		cancellationEffectiveDate: zuoraDateFormat(contractEffectiveDate),
		cancellationPolicy: 'SpecificDate',
		runBilling,
		collect,
	});
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
