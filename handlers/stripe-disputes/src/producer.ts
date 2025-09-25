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

	const stripeSignature: string | undefined = event.headers['Stripe-Signature'];

	logger.log(`Headers: ${JSON.stringify(event.headers)}`);
	logger.log(
		`Stripe-Signature: ${JSON.stringify(event.headers['Stripe-Signature'])}`,
	);

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

	logger.log({
		webhook_endpoint_secret: endpointSecretObject.webhook_endpoint_secret,
		secret_key: endpointSecretObject.secret_key,
	});

	try {
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
