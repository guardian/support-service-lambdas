import type { Logger } from '@modules/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listenDisputeCreatedInputSchema } from '../dtos';
import { upsertSalesforceObject } from '../services';
import type { SalesforceUpsertResponse } from '../types';

export function listenDisputeCreatedHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		try {
			logger.log('Processing Stripe dispute created webhook');

			// Parse the Stripe webhook payload
			const stripeWebhook = listenDisputeCreatedInputSchema.parse(
				JSON.parse(getIfDefined(event.body, 'No body was provided')),
			);
			logger.mutableAddContext(stripeWebhook.data.object.id);

			const salesforceResult: SalesforceUpsertResponse =
				await upsertSalesforceObject(logger, stripeWebhook);

			logger.log(
				`Payment Dispute upserted in Salesforce with ID: ${salesforceResult.id}`,
			);

			return {
				body: JSON.stringify({
					success: salesforceResult.success,
					salesforceId: salesforceResult.id,
					disputeId: stripeWebhook.data.object.id,
				}),
				statusCode: 200,
			};
		} catch (error) {
			logger.log('Error processing dispute created:', error);
			return {
				body: JSON.stringify({ error: 'Internal server error' }),
				statusCode: 500,
			};
		}
	};
}
