import type { ZuoraClient } from './zuoraClient';
import type { ZuoraSubscription } from './zuoraSchemas';
import { zuoraSubscriptionSchema } from './zuoraSchemas';

export const getSubscription = async (
	stage: string,
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
): Promise<ZuoraSubscription> => {
	const path = `v1/subscriptions/${subscriptionNumber}`;
	return zuoraClient.get<ZuoraSubscription>(path, zuoraSubscriptionSchema);
};
