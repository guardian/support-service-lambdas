import type { Logger } from '@modules/logger';
import { stageFromEnvironment } from '@modules/stage';
import { isZuoraRequestSuccess } from '@modules/zuora/helpers';
import { writeOffInvoice } from '@modules/zuora/invoice';
import { rejectPayment } from '@modules/zuora/payment';
import {
	cancelSubscription,
	getSubscription,
} from '@modules/zuora/subscription';
import type { ZuoraResponse } from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type { ListenDisputeClosedRequestBody } from '../dtos';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../interfaces';
import {
	upsertSalesforceObject,
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

				const rejectPaymentResponse: ZuoraResponse = await rejectPayment(
					zuoraClient,
					invoiceFromZuora.paymentPaymentNumber,
					'chargeback',
				);

				logger.log(
					'Payment rejection response:',
					JSON.stringify(rejectPaymentResponse),
				);

				if (!isZuoraRequestSuccess(rejectPaymentResponse)) {
					logger.error('Failed to reject payment in Zuora');
				} else {
					if (invoiceFromZuora.InvoiceId) {
						logger.log(`Writing off invoice: ${invoiceFromZuora.InvoiceId}`);

						const writeOffResponse: ZuoraResponse = await writeOffInvoice(
							zuoraClient,
							invoiceFromZuora.InvoiceId,
							`Invoice write-off due to Stripe dispute closure. Dispute ID: ${disputeId}`,
						);

						logger.log(
							'Invoice write-off response:',
							JSON.stringify(writeOffResponse),
						);

						if (!isZuoraRequestSuccess(writeOffResponse)) {
							logger.error('Failed to write off invoice in Zuora');
						} else {
							if (subscription.status === 'Active') {
								logger.log(
									`Canceling active subscription: ${subscriptionNumber}`,
								);

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
						}
					} else {
						logger.log('No invoice ID found, skipping invoice write-off');
					}
				}
			} else {
				logger.log('No payment number found, skipping payment rejection');
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
