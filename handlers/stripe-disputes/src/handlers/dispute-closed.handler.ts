import { getIfDefined } from '@modules/nullAndUndefined';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { Logger } from '@modules/logger';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listenDisputeClosedInputSchema } from '../dtos';
import type { SalesforceCredentials } from '../types';

export function listenDisputeClosedHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		logger.log('listenDisputeClosedHandler');

		// Get Salesforce credentials from AWS Secrets Manager
		const salesforceCredentials = await getSecretValue<SalesforceCredentials>(
			`${stageFromEnvironment()}/Stripe/Dispute-webhook-secrets/salesforce`,
		);
		console.log('Salesforce credentials:', salesforceCredentials);

		const stripeWebhook = listenDisputeClosedInputSchema.parse(
			JSON.parse(getIfDefined(event.body, 'No body was provided')),
		);
		logger.mutableAddContext(stripeWebhook.data.object.id);
		await Promise.resolve();
		return {
			body: JSON.stringify({ ...event, stage: process.env.STAGE }),
			statusCode: 200,
		};
	};
}
