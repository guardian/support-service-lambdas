import type { Logger } from '@modules/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listenDisputeCreatedInputSchema } from '../dtos';
import { upsertSalesforceObject } from '../services';
import type { SalesforceUpsertResponse } from '../types';

/**
 * Creates a handler function for processing Stripe dispute created webhooks
 *
 * @param logger - Logger instance for tracking webhook processing
 * @returns Handler function that processes API Gateway events for dispute creation
 */
export function listenDisputeCreatedHandler(logger: Logger) {
	/**
	 * Processes Stripe dispute created webhook events
	 *
	 * This handler:
	 * 1. Validates the incoming webhook payload
	 * 2. Upserts the dispute data to Salesforce
	 * 3. Returns success response with Salesforce record ID
	 *
	 * @param event - API Gateway proxy event containing webhook payload
	 * @returns Promise with HTTP response containing operation result
	 * @throws Returns 500 status code for any processing errors
	 */
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		try {
			logger.log('Processing Stripe dispute created webhook');

			// Parse the Stripe webhook payload
			const stripeWebhookData = listenDisputeCreatedInputSchema.parse(
				JSON.parse(getIfDefined(event.body, 'No body was provided')),
			);
			logger.mutableAddContext(stripeWebhookData.data.object.id);

			const salesforceResult: SalesforceUpsertResponse =
				await upsertSalesforceObject(logger, stripeWebhookData);

			logger.log(
				`Payment Dispute upserted in Salesforce with ID: ${salesforceResult.id}`,
			);

			return {
				body: JSON.stringify({
					success: salesforceResult.success,
					salesforceId: salesforceResult.id,
					disputeId: stripeWebhookData.data.object.id,
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
