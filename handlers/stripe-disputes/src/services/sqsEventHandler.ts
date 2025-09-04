import type { Logger } from '@modules/logger';
import type { SQSEvent } from 'aws-lambda';
import type {
	ListenDisputeClosedRequestBody,
	ListenDisputeCreatedRequestBody,
} from '../dtos';
import { upsertSalesforceObject } from './upsertSalesforceObject';

/**
 * Interface for SQS dispute event message
 */
interface DisputeEventMessage {
	eventType: 'dispute.created' | 'dispute.closed';
	webhookData: ListenDisputeCreatedRequestBody | ListenDisputeClosedRequestBody;
	timestamp: string;
	disputeId: string;
}

/**
 * Handles SQS events containing Stripe dispute data for asynchronous processing
 *
 * This function processes dispute events that were previously queued by the webhook handler.
 * It calls the appropriate dispute handler based on the event type.
 *
 * @param logger - Logger instance
 * @param sqsEvent - SQS event containing dispute messages
 */
export async function handleSqsEvents(
	logger: Logger,
	sqsEvent: SQSEvent,
): Promise<void> {
	const promises = sqsEvent.Records.map(async (record) => {
		try {
			logger.log(`Processing SQS record: ${record.messageId}`);

			// Parse the message
			const message = JSON.parse(record.body) as DisputeEventMessage;
			logger.mutableAddContext(message.disputeId);

			logger.log(
				`Processing ${message.eventType} for dispute ${message.disputeId}`,
			);

			// Process the dispute event directly using the unified service
			await upsertSalesforceObject(logger, message.webhookData);

			logger.log(
				`Successfully processed ${message.eventType} for dispute ${message.disputeId}`,
			);
		} catch (error) {
			logger.error(`Failed to process SQS record ${record.messageId}:`, error);
			// Re-throw to trigger SQS retry mechanism
			throw error;
		}
	});

	// Wait for all records to be processed
	await Promise.all(promises);
}
