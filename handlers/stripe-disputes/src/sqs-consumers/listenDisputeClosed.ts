import type { Logger } from '@modules/logger';
import { stageFromEnvironment } from '@modules/stage';
import {
	cancelSubscription,
	getSubscription,
} from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type { ListenDisputeClosedRequestBody } from '../dtos';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../interfaces';
import {
	rejectPayment,
	upsertSalesforceObject,
	writeOffInvoice,
	zuoraGetInvoiceFromStripeChargeId,
} from '../services';
import type { SalesforceUpsertResponse } from '../types';

export async function handleListenDisputeClosed(
	logger: Logger,
	webhookData: ListenDisputeClosedRequestBody,
	disputeId: string,
): Promise<SalesforceUpsertResponse> {
	logger.log(`Processing dispute closure for dispute ${disputeId}`);

	const paymentId = webhookData.data.object.charge;
	logger.log(`Payment ID from dispute: ${paymentId}`);

	const stage = stageFromEnvironment();
	const zuoraClient: ZuoraClient = await ZuoraClient.create(stage, logger);

	const invoiceFromZuora: ZuoraInvoiceFromStripeChargeIdResult =
		await zuoraGetInvoiceFromStripeChargeId(paymentId, zuoraClient);

	logger.log(JSON.stringify({ invoiceFromZuora }));

	const upsertSalesforceObjectResponse: SalesforceUpsertResponse =
		await upsertSalesforceObject(logger, webhookData, invoiceFromZuora);

	logger.log(
		'Salesforce upsert response:',
		JSON.stringify(upsertSalesforceObjectResponse),
	);

	try {
		const subscriptionNumber = invoiceFromZuora.SubscriptionNumber;
		logger.log(`Retrieved subscription number: ${subscriptionNumber}`);

		if (subscriptionNumber) {
			const subscription = await getSubscription(
				zuoraClient,
				subscriptionNumber,
			);
			logger.log(`Subscription status: ${subscription.status}`);

			if (invoiceFromZuora.paymentPaymentNumber) {
				logger.log(
					`Rejecting payment: ${invoiceFromZuora.paymentPaymentNumber}`,
				);

				const rejectPaymentResponse = await rejectPayment(
					zuoraClient,
					invoiceFromZuora.paymentPaymentNumber,
					'chargeback',
				);

				logger.log(
					'Payment rejection response:',
					JSON.stringify(rejectPaymentResponse),
				);

				if (!rejectPaymentResponse.Success) {
					logger.error('Failed to reject payment in Zuora');
				}
			} else {
				logger.log('No payment number found, skipping payment rejection');
			}

			if (invoiceFromZuora.InvoiceId) {
				logger.log(`Writing off invoice: ${invoiceFromZuora.InvoiceId}`);

				const writeOffResponse = await writeOffInvoice(
					zuoraClient,
					invoiceFromZuora.InvoiceId,
					`Invoice write-off due to Stripe dispute closure. Dispute ID: ${disputeId}`,
				);

				logger.log(
					'Invoice write-off response:',
					JSON.stringify(writeOffResponse),
				);

				if (!writeOffResponse.Success) {
					logger.error('Failed to write off invoice in Zuora');
				}
			} else {
				logger.log('No invoice ID found, skipping invoice write-off');
			}

			if (subscription.status === 'Active') {
				logger.log(`Canceling active subscription: ${subscriptionNumber}`);

				const cancelResponse = await cancelSubscription(
					zuoraClient,
					subscriptionNumber,
					dayjs(),
					false,
					undefined,
					'EndOfLastInvoicePeriod',
				);

				logger.log(
					'Subscription cancellation response:',
					JSON.stringify(cancelResponse),
				);

				if (!cancelResponse.Success) {
					logger.error('Failed to cancel subscription in Zuora');
				}
			} else {
				logger.log(
					`Subscription already inactive (${subscription.status}), skipping cancellation`,
				);
			}
		} else {
			logger.log('No subscription found, skipping Zuora operations');
		}
	} catch (zuoraError) {
		logger.error('Error during Zuora operations:', zuoraError);
	}

	logger.log(`Successfully processed dispute closure for dispute ${disputeId}`);
	return upsertSalesforceObjectResponse;
}
