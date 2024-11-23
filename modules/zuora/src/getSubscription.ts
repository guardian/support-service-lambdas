import type { ZuoraClient } from './zuoraClient';
import type {
	ZuoraSubscription,
	ZuoraSubscriptionsFromAccountResponse,
} from './zuoraSchemas';
import {
	zuoraSubscriptionResponseSchema,
	zuoraSubscriptionsFromAccountSchema,
} from './zuoraSchemas';

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
	return response.subscriptions;
};
