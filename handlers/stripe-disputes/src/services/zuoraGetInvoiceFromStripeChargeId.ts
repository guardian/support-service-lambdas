import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../interfaces';
import type {
	ZuoraInvoiceItemQueryOutput,
	ZuoraInvoiceItemQueryResponse,
	ZuoraInvoicePaymentQueryOutput,
	ZuoraInvoicePaymentQueryResponse,
	ZuoraPaymentQueryOutput,
	ZuoraPaymentQueryResponse,
} from '../types';
import {
	ZuoraGetInvoiceItemQueryOutputResponseSchema,
	ZuoraGetInvoicePaymentQueryOutputResponseSchema,
	ZuoraGetPaymentQueryOutputResponseSchema,
} from '../zod-schemas';

/**
 * Retrieves invoice and subscription information from Zuora based on a Stripe charge ID
 *
 * This function performs a multi-step query process:
 * 1. Finds the payment record using the Stripe charge ID as reference
 * 2. Locates invoice payments associated with that payment
 * 3. Finds invoice items for the invoice, filtering for items with subscriptions
 *
 * @param stripeChargeId - The Stripe charge ID to look up in Zuora (e.g., "ch_1234567890")
 * @param zuoraClient - Authenticated Zuora client for making API calls
 * @returns Promise containing payment, invoice, and subscription information
 * @throws {Error} When no payment is found for the given Stripe charge ID
 * @throws {Error} When database queries fail or return invalid data
 * @throws {Error} When no invoice items with subscriptions are found
 */
export const zuoraGetInvoiceFromStripeChargeId = async (
	stripeChargeId: string,
	zuoraClient: ZuoraClient,
): Promise<ZuoraInvoiceFromStripeChargeIdResult> => {
	const paymentResponse: ZuoraPaymentQueryResponse = await doQuery(
		zuoraClient,
		`SELECT id, referenceid, paymentnumber, status, accountid FROM Payment WHERE ReferenceID = '${stripeChargeId}' LIMIT 1`,
		ZuoraGetPaymentQueryOutputResponseSchema,
	);

	if (paymentResponse.records.length === 0) {
		throw new Error(
			`No payment found in Zuora with ReferenceID = '${stripeChargeId}'`,
		);
	}

	if (paymentResponse.records[0] == undefined) {
		throw new Error('Payment found but record is undefined');
	}

	const foundPayment: ZuoraPaymentQueryOutput = paymentResponse.records[0];

	const paymentsInvoices: ZuoraInvoicePaymentQueryResponse = await doQuery(
		zuoraClient,
		`SELECT invoiceid FROM InvoicePayment WHERE PaymentID = '${foundPayment.Id}'`,
		ZuoraGetInvoicePaymentQueryOutputResponseSchema,
	);

	if (paymentsInvoices.records.length === 0) {
		throw new Error(
			`No paymentsInvoices found in Zuora with ReferenceID = '${foundPayment.Id}'`,
		);
	}

	if (paymentsInvoices.records[0] == undefined) {
		throw new Error('paymentsInvoices found but record is undefined');
	}

	const foundPaymentsInvoice: ZuoraInvoicePaymentQueryOutput =
		paymentsInvoices.records[0];

	const invoicesItems: ZuoraInvoiceItemQueryResponse = await doQuery(
		zuoraClient,
		`SELECT Id, SubscriptionId, SubscriptionNumber FROM InvoiceItem WHERE InvoiceId = '${foundPaymentsInvoice.InvoiceId}'`,
		ZuoraGetInvoiceItemQueryOutputResponseSchema,
	);

	if (invoicesItems.records.length === 0) {
		throw new Error(
			`No invoicesItems found in Zuora with ReferenceID = '${foundPaymentsInvoice.InvoiceId}'`,
		);
	}

	if (invoicesItems.records[0] == undefined) {
		throw new Error('invoicesItems found but record is undefined');
	}

	const invoiceItem: ZuoraInvoiceItemQueryOutput | undefined =
		invoicesItems.records.filter((item) => {
			return item.SubscriptionId != null;
		})[0];

	if (!invoiceItem) {
		throw new Error('No invoice item with a subscription found');
	}

	return {
		paymentId: foundPayment.Id,
		paymentStatus: foundPayment.Status,
		paymentPaymentNumber: foundPayment.PaymentNumber,
		paymentAccountId: foundPayment.AccountId,
		paymentReferenceId: foundPayment.ReferenceId,
		InvoiceId: foundPaymentsInvoice.InvoiceId,
		paymentsInvoiceId: foundPaymentsInvoice.Id,
		subscriptionId: invoiceItem.SubscriptionId!,
		SubscriptionNumber: invoiceItem.SubscriptionNumber!,
	} satisfies ZuoraInvoiceFromStripeChargeIdResult;
};
