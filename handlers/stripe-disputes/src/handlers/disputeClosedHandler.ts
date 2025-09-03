import type { Logger } from '@modules/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listenDisputeClosedInputSchema } from '../dtos';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../interfaces';
import {
	upsertSalesforceObject,
	zuoraGetInvoiceFromStripeChargeId,
} from '../services';
import type { SalesforceUpsertResponse } from '../types';

/**
 * Creates a handler function for processing Stripe dispute closed webhooks
 *
 * @param logger - Logger instance for tracking webhook processing
 * @returns Handler function that processes API Gateway events for dispute closure
 */
export function listenDisputeClosedHandler(logger: Logger) {
	/**
	 * Processes Stripe dispute closed webhook events
	 *
	 * This handler:
	 * 1. Validates the incoming webhook payload
	 * 2. Retrieves related invoice data from Zuora
	 * 3. Upserts enriched dispute data to Salesforce
	 * 4. Returns success response
	 *
	 * @param event - API Gateway proxy event containing webhook payload
	 * @returns Promise with HTTP response containing operation result
	 * @throws Returns 500 status code for any processing errors
	 */
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		try {
			logger.log('Processing Stripe dispute closed webhook');

			const stripeWebhookData = listenDisputeClosedInputSchema.parse(
				JSON.parse(getIfDefined(event.body, 'No body was provided')),
			);
			logger.mutableAddContext(stripeWebhookData.data.object.id);

			const paymentId = stripeWebhookData.data.object.charge;

			logger.log(`Payment ID from dispute: ${paymentId}`);

			const stage = stageFromEnvironment();
			const zuoraClient: ZuoraClient = await ZuoraClient.create(stage, logger);

			const invoiceFromZuora: ZuoraInvoiceFromStripeChargeIdResult =
				await zuoraGetInvoiceFromStripeChargeId(paymentId, zuoraClient);

			logger.log(JSON.stringify({ invoiceFromZuora }));

			const salesforceResult: SalesforceUpsertResponse =
				await upsertSalesforceObject(
					logger,
					stripeWebhookData,
					invoiceFromZuora,
				);

			logger.log(
				`Payment Dispute upserted in Salesforce with ID: ${salesforceResult.id}`,
			);

			// TODO: Implement dispute closed logic

			return {
				body: JSON.stringify({
					message: 'Dispute closed webhook received',
					disputeId: stripeWebhookData.data.object.id,
					stage: process.env.STAGE,
				}),
				statusCode: 200,
			};
		} catch (error) {
			logger.log(
				'Error processing dispute closed:',
				error instanceof Error ? error.message : String(error),
			);
			return {
				body: JSON.stringify({ error: 'Internal server error' }),
				statusCode: 500,
			};
		}
	};
}
