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

/**
 * Handles dispute.closed SQS events with comprehensive Zuora dispute processing
 *
 * This consumer processes dispute closure events and performs the following actions:
 * 1. Updates Salesforce with dispute data
 * 2. Retrieves Zuora invoice/payment/subscription data
 * 3. Rejects the disputed payment in Zuora
 * 4. Writes off the related invoice
 * 5. Cancels the subscription if needed
 *
 * @param logger - Logger instance with dispute context
 * @param webhookData - Validated dispute closed webhook payload
 * @param disputeId - Dispute ID for logging context
 * @returns Salesforce upsert response
 */
export async function handleListenDisputeClosed(
	logger: Logger,
	webhookData: ListenDisputeClosedRequestBody,
	disputeId: string,
): Promise<SalesforceUpsertResponse> {
	logger.log(`Processing dispute closure for dispute ${disputeId}`);

	const paymentId = webhookData.data.object.charge;
	logger.log(`Payment ID from dispute: ${paymentId}`);

	// Step 1: Update Salesforce with dispute data
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

	// Step 2: Process dispute closure in Zuora
	try {
		// Get subscription info
		const subscriptionNumber = invoiceFromZuora.SubscriptionNumber;
		logger.log(`Retrieved subscription number: ${subscriptionNumber}`);

		if (subscriptionNumber) {
			const subscription = await getSubscription(
				zuoraClient,
				subscriptionNumber,
			);
			logger.log(`Subscription status: ${subscription.status}`);

			// Step 3: Reject the payment
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

			// Step 4: Write off the invoice
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

			// Step 5: Cancel subscription at end of last invoice period
			if (subscription.status === 'Active') {
				logger.log(`Canceling active subscription: ${subscriptionNumber}`);

				// Use existing cancelSubscription from @modules/zuora with EndOfLastInvoicePeriod
				const cancelResponse = await cancelSubscription(
					zuoraClient,
					subscriptionNumber,
					dayjs(), // Not used for EndOfLastInvoicePeriod but required by signature
					false, // Don't run billing
					undefined, // Don't collect
					'EndOfLastInvoicePeriod', // Use EndOfLastInvoicePeriod policy as requested
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
		// Continue processing - Salesforce record was already created successfully
		logger.log('Continuing despite Zuora errors - Salesforce record created');
	}

	logger.log(`Successfully processed dispute closure for dispute ${disputeId}`);
	return upsertSalesforceObjectResponse;
}
