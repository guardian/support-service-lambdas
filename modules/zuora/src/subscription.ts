import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from './utils/common';
import type { ZuoraClient } from './zuoraClient';
import type { ZuoraSubscription, ZuoraSuccessResponse } from './zuoraSchemas';
import {
	zuoraSubscriptionResponseSchema,
	zuoraSuccessResponseSchema,
} from './zuoraSchemas';
import { zuoraSubscriptionsFromAccountSchema } from './types/objects/account';
import type { ZuoraSubscriptionsFromAccountResponse } from './types/objects/account';

export const cancelSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	contractEffectiveDate: Dayjs,
	runBilling: boolean,
	collect: boolean | undefined = undefined,
): Promise<ZuoraSuccessResponse> => {
	const path = `/v1/subscriptions/${subscriptionNumber}/cancel`;
	const body = JSON.stringify({
		cancellationEffectiveDate: zuoraDateFormat(contractEffectiveDate),
		cancellationPolicy: 'SpecificDate',
		runBilling,
		collect,
	});
	return zuoraClient.put(path, body, zuoraSuccessResponseSchema, {
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
