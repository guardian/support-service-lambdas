import { Logger } from '@modules/routing/logger';
import { Router } from '@modules/routing/router';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handleStripeWebhook } from './services';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { StripeCredentials } from './types';
import { stageFromEnvironment } from '@modules/stage';
import Stripe from 'stripe';

const logger = new Logger();

const router = Router([
	{
		httpMethod: 'POST',
		path: '/',
		handler: async (event: APIGatewayProxyEvent) => {
			// Parse the webhook body to determine the event type
			const body = JSON.parse(event.body || '{}');
			const eventType = body.type;

			logger.log(`Received webhook event type: ${eventType}`);

			// Route based on event type
			switch (eventType) {
				case 'charge.dispute.created':
					return handleStripeWebhook(logger, 'dispute.created')(event);
				case 'charge.dispute.closed':
					return handleStripeWebhook(logger, 'dispute.closed')(event);
				default:
					logger.log(`Unhandled webhook event type: ${eventType}`);
					return {
						statusCode: 200,
						body: JSON.stringify({
							received: true,
							message: `Event type ${eventType} not handled`,
						}),
					};
			}
		},
	},
]);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult | void> => {
	logger.log(`Input: ${JSON.stringify(event)}`);

	const stripeSignature: string | undefined = event.headers['Stripe-Signature'];

	logger.log(`Headers: ${JSON.stringify(event.headers)}`);

	if (!stripeSignature) {
		logger.error('Missing Stripe-Signature header');
		return {
			statusCode: 400,
			body: JSON.stringify({ message: 'Missing Stripe-Signature header' }),
		};
	}

	if (!event.body) {
		logger.error('Missing request body');
		return {
			statusCode: 400,
			body: JSON.stringify({ message: 'Missing request body' }),
		};
	}

	const endpointSecretObject: StripeCredentials =
		await getSecretValue<StripeCredentials>(
			`${stageFromEnvironment()}/Stripe/ConnectedApp/StripeDisputeWebhooks`,
		);

	try {
		// Doc: https://docs.stripe.com/identity/handle-verification-outcomes#create-webhook
		new Stripe(endpointSecretObject.secret_key).webhooks.constructEvent(
			event.body,
			stripeSignature,
			endpointSecretObject.webhook_endpoint_secret,
		);
		logger.log('Processing API Gateway webhook event');
		const response: APIGatewayProxyResult = await router(event);
		logger.log(`Webhook response: ${JSON.stringify(response)}`);
		return response;
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		logger.error(`Error verifying Stripe webhook signature: ${errorMessage}`);
		return {
			statusCode: 403,
			body: JSON.stringify({ message: `Webhook Error: ${errorMessage}` }),
		};
	}
};
