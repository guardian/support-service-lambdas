import { Logger } from '@modules/logger';
import type { APIGatewayProxyResult, SQSEvent } from 'aws-lambda';
import { handleSqsEvents } from './services';

const logger = new Logger();

/**
 * Hybrid Lambda handler supporting both API Gateway webhooks and SQS events
 *
 * Flow:
 * 1. Stripe webhook → API Gateway → validates + sends to SQS → returns 200
 * 2. SQS event → processes dispute asynchronously → calls Salesforce/Zuora
 */
export const handler = async (
	event: SQSEvent,
): Promise<APIGatewayProxyResult | void> => {
	logger.log(`Input: ${JSON.stringify(event)}`);

	if (isSqsEvent(event)) {
		// Handle asynchronous SQS event processing
		logger.log(`Processing ${event.Records.length} SQS dispute events`);
		await handleSqsEvents(logger, event);
		logger.log('SQS events processed successfully');
		return; // No return value for SQS events
	} else {
		logger.error('Unknown event type received');
		throw new Error('Unsupported event type');
	}
};

/**
 * Type guard to check if event is from SQS
 */
function isSqsEvent(event: any): event is SQSEvent {
	return (
		event.Records !== undefined &&
		Array.isArray(event.Records) &&
		event.Records.length > 0 &&
		event.Records[0].eventSource === 'aws:sqs'
	);
}
