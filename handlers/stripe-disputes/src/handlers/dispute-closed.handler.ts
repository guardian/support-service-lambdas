import type { Logger } from '@modules/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listenDisputeClosedInputSchema } from '../dtos';
import type { SalesforceCredentials } from '../types';

export function listenDisputeClosedHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		try {
			logger.log('Processing Stripe dispute closed webhook');

			// Get Salesforce credentials from AWS Secrets Manager
			const salesforceCredentials = await getSecretValue<SalesforceCredentials>(
				`${stageFromEnvironment()}/Stripe/Dispute-webhook-secrets/salesforce`,
			);
			console.log('Salesforce credentials:', salesforceCredentials);

			const stripeWebhook = listenDisputeClosedInputSchema.parse(
				JSON.parse(getIfDefined(event.body, 'No body was provided')),
			);
			logger.mutableAddContext(stripeWebhook.data.object.id);

			// TODO: Implement dispute closed logic
			return {
				body: JSON.stringify({
					message: 'Dispute closed webhook received',
					disputeId: stripeWebhook.data.object.id,
					stage: process.env.STAGE,
				}),
				statusCode: 200,
			};
		} catch (error) {
			logger.log('Error processing dispute closed:', error);
			return {
				body: JSON.stringify({ error: 'Internal server error' }),
				statusCode: 500,
			};
		}
	};
}
