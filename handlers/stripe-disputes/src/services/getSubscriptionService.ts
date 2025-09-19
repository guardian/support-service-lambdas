import type { Logger } from '@modules/routing/logger';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export async function getSubscriptionService(
	logger: Logger,
	zuoraClient: ZuoraClient,
	subscriptionNumber: string | undefined,
): Promise<ZuoraSubscription | null> {
	if (!subscriptionNumber) {
		logger.log('No subscription found, skipping Zuora operations');
		return null;
	}

	logger.log(`Retrieved subscription number: ${subscriptionNumber}`);
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	logger.log(`Subscription status: ${subscription.status}`);

	return subscription;
}
