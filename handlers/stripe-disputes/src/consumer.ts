import { Logger } from '@modules/logger';
import type { SQSEvent } from 'aws-lambda';
import type {
	ListenDisputeClosedRequestBody,
	ListenDisputeCreatedRequestBody,
} from './dtos';
import {
	handleListenDisputeClosed,
	handleListenDisputeCreated,
} from './sqs-consumers';

const logger = new Logger();

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
 * SQS Consumer Lambda handler for processing Stripe dispute events
 *
 * This handler:
 * 1. Receives events from the SQS dispute queue
 * 2. Processes disputes asynchronously with Salesforce/Zuora integration
 * 3. Benefits from SQS retry mechanism and dead letter queue on failures
 */
export const handler = async (event: SQSEvent): Promise<void> => {
	logger.log(`Input: ${JSON.stringify(event)}`);
	logger.log(`Processing ${event.Records.length} SQS dispute events`);

	const promises = event.Records.map(async (record) => {
		try {
			logger.log(`Processing SQS record: ${record.messageId}`);

			const message = JSON.parse(record.body) as DisputeEventMessage;
			logger.mutableAddContext(message.disputeId);

			logger.log(
				`Processing ${message.eventType} for dispute ${message.disputeId}`,
			);

			switch (message.eventType) {
				case 'dispute.created': {
					await handleListenDisputeCreated(
						logger,
						message.webhookData as ListenDisputeCreatedRequestBody,
						message.disputeId,
					);
					break;
				}
				case 'dispute.closed': {
					await handleListenDisputeClosed(
						logger,
						message.webhookData as ListenDisputeClosedRequestBody,
						message.disputeId,
					);
					break;
				}
				default: {
					throw new Error(`Unknown event type: ${String(message.eventType)}`);
				}
			}

			logger.log(
				`Successfully processed ${message.eventType} for dispute ${message.disputeId}`,
			);
		} catch (error) {
			logger.error(`Failed to process SQS record ${record.messageId}:`, error);
			throw error;
		}
	});

	await Promise.all(promises);

	logger.log('SQS events processed successfully');
};
