import { Logger } from '@modules/routing/logger';
import { Router } from '@modules/routing/router';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';
import { z } from 'zod';
import { handleStripeWebhook } from './services';
import type { StripeCredentials } from './types';

const logger = new Logger();

const bodyWithTypeSchema = z.object({
	type: z.string(),
});

const router = Router([
	{
		httpMethod: 'POST',
		path: '/',
		handler: async (event: APIGatewayProxyEvent) => {
			// Parse the webhook body to determine the event type
			const body = bodyWithTypeSchema.parse(JSON.parse(event.body ?? '{}'));
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

	// Try to verify with both Stripe accounts (main and Australian)
	// Doc: https://docs.stripe.com/identity/handle-verification-outcomes#create-webhook
	let verifiedEvent: Stripe.Event | null = null;
	let lastError: Error | null = null;

	const stripe = new Stripe(endpointSecretObject.secret_key);

	// Try main account first
	try {
		verifiedEvent = stripe.webhooks.constructEvent(
			event.body,
			stripeSignature,
			endpointSecretObject.webhook_endpoint_secret,
		);
		logger.log('Webhook verified with main Stripe account');
	} catch (err) {
		logger.log('Failed to verify with main account, trying Australian account');
		lastError = err instanceof Error ? err : new Error('Unknown error');

		// Try Australian account
		try {
			const stripeAustralia = new Stripe(
				endpointSecretObject.secret_key_autralia,
			);
			verifiedEvent = stripeAustralia.webhooks.constructEvent(
				event.body,
				stripeSignature,
				endpointSecretObject.webhook_endpoint_secret_autralia,
			);
			logger.log('Webhook verified with Australian Stripe account');
		} catch (errAu) {
			lastError = errAu instanceof Error ? errAu : new Error('Unknown error');
			logger.error('Failed to verify with both accounts');
		}
	}

	// If both failed, return error
	if (!verifiedEvent) {
		const errorMessage = lastError?.message ?? 'Unknown error';
		logger.error(`Error verifying Stripe webhook signature: ${errorMessage}`);
		return {
			statusCode: 403,
			body: JSON.stringify({ message: `Webhook Error: ${errorMessage}` }),
		};
	}

	// Continue with verified event
	logger.log('Processing API Gateway webhook event');
	const response: APIGatewayProxyResult = await router(event);
	logger.log(`Webhook response: ${JSON.stringify(response)}`);
	return response;
};
