import type { Logger } from '@modules/routing/logger';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraError } from '@modules/zuora/errors';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ListenDisputeClosedRequestBody } from '../dtos';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../interfaces';
import {
	cancelSubscriptionService,
	getSubscriptionService,
	rejectPaymentService,
	upsertSalesforceObject,
	writeOffInvoiceService,
	zuoraGetInvoiceFromStripeChargeId,
} from '../services';
import type { SalesforceUpsertResponse } from '../types';

export async function handleListenDisputeClosed(
	logger: Logger,
	webhookData: ListenDisputeClosedRequestBody,
	disputeId: string,
): Promise<SalesforceUpsertResponse | null> {
	logger.log(`Processing dispute closure for dispute ${disputeId}`);

	// Skip SEPA payment disputes (they don't have payment_method_details)
	if (!webhookData.data.object.payment_method_details) {
		logger.log(
			`Skipping dispute ${disputeId} - no payment_method_details (likely SEPA payment)`,
		);
		return null;
	}

	const paymentId = webhookData.data.object.charge;
	logger.log(`Payment ID from dispute: ${paymentId}`);

	const stage = stageFromEnvironment();
	const zuoraClient: ZuoraClient = await ZuoraClient.create(stage);

	const invoiceFromZuora: ZuoraInvoiceFromStripeChargeIdResult =
		await zuoraGetInvoiceFromStripeChargeId(paymentId, zuoraClient);

	logger.log(JSON.stringify({ invoiceFromZuora }));

	const upsertSalesforceObjectResponse: SalesforceUpsertResponse =
		await upsertSalesforceObject(logger, webhookData, invoiceFromZuora);

	logger.log(
		'Salesforce upsert response:',
		JSON.stringify(upsertSalesforceObjectResponse),
	);

	const subscription = await getSubscriptionService(
		logger,
		zuoraClient,
		invoiceFromZuora.SubscriptionNumber,
	);

	if (subscription) {
		let shouldWriteOffInvoice = true;

		// Try to reject payment - may fail if already refunded
		try {
			await rejectPaymentService(
				logger,
				zuoraClient,
				invoiceFromZuora.paymentPaymentNumber,
			);
		} catch (error) {
			if (
				error instanceof ZuoraError &&
				error.zuoraErrorDetails.some((detail) => detail.code === '66000030')
			) {
				logger.log(
					`Payment already processed (likely refunded before dispute). Skipping invoice write-off.`,
				);
				// Skip writeOffInvoice - it will fail because there's no rejected payment
				shouldWriteOffInvoice = false;
			} else {
				throw error;
			}
		}

		// Only write off invoice if payment rejection succeeded
		if (shouldWriteOffInvoice) {
			await writeOffInvoiceService(
				logger,
				zuoraClient,
				invoiceFromZuora.InvoiceId,
				disputeId,
			);
		}

		// Always cancel subscription for disputes, even if payment already processed
		await cancelSubscriptionService(logger, zuoraClient, subscription);
	}

	logger.log(`Successfully processed dispute closure for dispute ${disputeId}`);
	return upsertSalesforceObjectResponse;
}
