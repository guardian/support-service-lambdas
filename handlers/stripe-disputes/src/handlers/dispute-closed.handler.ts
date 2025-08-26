import type { Logger } from '@modules/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
// import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listenDisputeClosedInputSchema } from '../dtos';
// import type {
// 	// SalesforceCredentials,
// 	// ZuoraCredentials,
// 	ZuoraGetPaymentQueryOutput,
// } from '../types';
// import {getInvoiceSchema} from "@modules/zuora/src";
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../interfaces';
import { zuoraGetInvoiceFromStripeChargeId } from '../services';

export function listenDisputeClosedHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		// try {
		logger.log('Processing Stripe dispute closed webhook');

		// Get Salesforce credentials from AWS Secrets Manager
		/*const salesforceCredentials = await getSecretValue<SalesforceCredentials>(
				`${stageFromEnvironment()}/Salesforce/ConnectedApp/StripeDisputeWebhooks`,
			);*/

		// Get Salesforce credentials from AWS Secrets Manager
		// const zuoraCredentials: ZuoraCredentials = await getSecretValue<ZuoraCredentials>(
		//	`${stageFromEnvironment()}/Salesforce/ConnectedApp/StripeDisputeWebhooks`,
		// );

		const stripeWebhook = listenDisputeClosedInputSchema.parse(
			JSON.parse(getIfDefined(event.body, 'No body was provided')),
		);
		logger.mutableAddContext(stripeWebhook.data.object.id);

		const paymentId = stripeWebhook.data.object.charge;
		logger.log(`Payment ID from dispute: ${paymentId}`);

		//const zoqlQueryInvoicePayment = `SELECT invoiceid FROM InvoicePayment WHERE PaymentID = '8ad0982798c703180198d17ae0e37a74' LIMIT 1`;
		//const zoqlQueryInvoice = `SELECT invoicenumber, status FROM Invoice WHERE id = '8ad0982798c703180198d17ae0567a69' LIMIT 1`;

		// find the payment in Zuora using the paymentId
		// authenticate with Zuora
		const stage = stageFromEnvironment();
		const zuoraClient: ZuoraClient = await ZuoraClient.create(stage, logger);

		/*const paymentResponse: z.infer<typeof ZuoraGetPaymentQueryOutputResponseSchema> = await zuoraClient.post(
			`/v1/action/query`,
			JSON.stringify({
				queryString: zoqlQueryPayment,
			}),
			ZuoraGetPaymentQueryOutputResponseSchema,
		);*/

		const invoiceFromZuora: ZuoraInvoiceFromStripeChargeIdResult =
			await zuoraGetInvoiceFromStripeChargeId(paymentId, zuoraClient);

		logger.log(JSON.stringify({ invoiceFromZuora }));

		// TODO: Implement dispute closed logic
		return {
			body: JSON.stringify({
				message: invoiceFromZuora,
				disputeId: stripeWebhook.data.object.id,
				stage: process.env.STAGE,
			}),
			statusCode: 200,
		};
		/*} catch (error) {
			logger.log('Error processing dispute closed:', error.message);
			return {
				body: JSON.stringify({ error: 'Internal server error' }),
				statusCode: 200,
			};
		}*/
	};
}
