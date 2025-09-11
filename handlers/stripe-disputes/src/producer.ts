import { Logger } from '@modules/logger';
import { Router } from '@modules/routing/router';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handleStripeWebhook } from './services';

const logger = new Logger();

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
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult | void> => {
	logger.log(`Input: ${JSON.stringify(event)}`);

	if (isApiGatewayEvent(event)) {
		logger.log('Processing API Gateway webhook event');
		const response = await router.routeRequest(event);
		logger.log(`Webhook response: ${JSON.stringify(response)}`);
		return response;
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
