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

export function listenDisputeClosedHandler(logger: Logger) {
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
