import { Logger } from '@modules/logger';
import { Router } from '@modules/routing/router';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	SQSEvent,
	Context,
} from 'aws-lambda';
// Original handlers kept for reference but not used in router
// import {
// 	listenDisputeCreatedHandler,
// 	listenDisputeClosedHandler,
// } from './handlers';
import { handleStripeWebhook, handleSqsEvents } from './services';

const logger = new Logger();

// Router for API Gateway webhook endpoints (synchronous)
const router = new Router([
	{
		httpMethod: 'POST',
		path: '/listen-dispute-created',
		handler: handleStripeWebhook(logger, 'dispute.created'),
	},
	{
		httpMethod: 'POST',
		path: '/listen-dispute-closed',
		handler: handleStripeWebhook(logger, 'dispute.closed'),
	},
]);

/**
 * Hybrid Lambda handler supporting both API Gateway webhooks and SQS events
 *
 * Flow:
 * 1. Stripe webhook → API Gateway → validates + sends to SQS → returns 200
 * 2. SQS event → processes dispute asynchronously → calls Salesforce/Zuora
 */
export const handler = async (
	event: APIGatewayProxyEvent | SQSEvent,
	context: Context,
): Promise<APIGatewayProxyResult | void> => {
	logger.log(`Input: ${JSON.stringify(event)}`);

	// Detect event type
	if (isApiGatewayEvent(event)) {
		// Handle synchronous webhook from Stripe
		logger.log('Processing API Gateway webhook event');
		const response = await router.routeRequest(event);
		logger.log(`Webhook response: ${JSON.stringify(response)}`);
		return response;
	} else if (isSqsEvent(event)) {
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
 * Type guard to check if event is from API Gateway
 */
function isApiGatewayEvent(event: any): event is APIGatewayProxyEvent {
	return event.httpMethod !== undefined && event.path !== undefined;
}

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
