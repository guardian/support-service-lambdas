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
		path: '/listen-dispute-created',
		handler: handleStripeWebhook(logger, 'dispute.created'),
	},
	{
		httpMethod: 'POST',
		path: '/listen-dispute-closed',
		handler: handleStripeWebhook(logger, 'dispute.closed'),
	},
]);

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult | void> => {
	logger.log(`Input: ${JSON.stringify(event)}`);

	const stripeSignature: string | undefined = event.headers['stripe-signature'];

	if (!stripeSignature) {
		logger.error('Missing Stripe-Signature header');
		return {
			statusCode: 400,
			body: JSON.stringify({ message: 'Missing Stripe-Signature header' }),
		};
	}

	const endpointSecretObject: StripeCredentials =
		await getSecretValue<StripeCredentials>(
			`${stageFromEnvironment()}/Stripe/ConnectedApp/StripeDisputeWebhooks`,
		);

	// const stripeInstance = new Stripe(endpointSecretObject.secret_key);
	// let stripeEvent: Stripe.Event | null = null;

	try {
		new Stripe(endpointSecretObject.secret_key).webhooks.constructEvent(
			JSON.stringify(event.body),
			stripeSignature,
			endpointSecretObject.secret_key,
		);
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		logger.error(`Error verifying Stripe webhook signature: ${errorMessage}`);
		return {
			statusCode: 403,
			body: JSON.stringify({ message: `Webhook Error: ${errorMessage}` }),
		};
	}

	if (isApiGatewayEvent(event)) {
		logger.log('Processing API Gateway webhook event');
		const response: APIGatewayProxyResult = await router(event);
		logger.log(`Webhook response: ${JSON.stringify(response)}`);
		return response;
	} else {
		logger.error('Unknown event type received');
		throw new Error('Unsupported event type');
	}
};

function isApiGatewayEvent(event: unknown): event is APIGatewayProxyEvent {
	return (
		typeof event === 'object' &&
		event !== null &&
		'httpMethod' in event &&
		'path' in event
	);
}
