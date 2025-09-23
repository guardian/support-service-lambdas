import type { Logger } from '@modules/routing/logger';
import { cancelSubscription } from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';

export async function cancelSubscriptionService(
	logger: Logger,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
): Promise<boolean> {
	if (subscription.status !== 'Active') {
		logger.log(
			`Subscription already inactive (${subscription.status}), skipping cancellation`,
		);
		return false;
	}

	logger.log(
		`Canceling active subscription: ${subscription.subscriptionNumber}`,
	);

	const cancelResponse = await cancelSubscription(
		zuoraClient,
		subscription.subscriptionNumber,
		dayjs(),
		false,
		undefined,
		'EndOfLastInvoicePeriod',
	);

	logger.log(
		'Subscription cancellation response:',
		JSON.stringify(cancelResponse),
	);

	return true;
}
