import { groupBy } from '@modules/arrayFunctions';
import { logger } from '@modules/logger/logger';
import type { BillingDateMessage } from '../billingDateMessage';
import type { ProcessorServices } from './processBillingDate';
import { processBillingDate } from './processBillingDate';

export type BatchMessage = {
	messageId: string;
	message: BillingDateMessage;
};

/**
 * Zuora sends a callout per charge, so a batch usually holds several messages for the same
 * subscription. Each subscription is fetched once and all its messages are processed against it.
 *
 * @returns the ids of the messages that failed, so only those are retried
 */
export async function processBatch(
	services: ProcessorServices,
	messages: BatchMessage[],
): Promise<string[]> {
	const bySubscription = groupBy(
		messages,
		({ message }) => message.subscriptionNumber,
	);
	const failedMessageIds: string[] = [];
	for (const [subscriptionNumber, subscriptionMessages] of Object.entries(
		bySubscription,
	)) {
		try {
			await processSubscription(
				services,
				subscriptionNumber,
				subscriptionMessages,
			);
		} catch (error) {
			logger.error(`failed to process ${subscriptionNumber}`, error);
			failedMessageIds.push(
				...subscriptionMessages.map(({ messageId }) => messageId),
			);
		}
	}
	return failedMessageIds;
}

const processSubscription = logger.withContext(
	async (
		services: ProcessorServices,
		subscriptionNumber: string,
		messages: BatchMessage[],
	) => {
		const subscription = await services.getSubscription(subscriptionNumber);
		for (const { message } of messages) {
			processBillingDate(subscription, message);
		}
	},
	([, subscriptionNumber]) => subscriptionNumber,
);
