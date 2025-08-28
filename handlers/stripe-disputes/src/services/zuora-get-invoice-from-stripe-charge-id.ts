import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { z } from 'zod';
import { executeZoqlQuery } from '../helpers';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../interfaces';
import {
	ZuoraGetInvoiceItemQueryOutputResponseSchema,
	type ZuoraGetInvoiceItemQueryOutputSchema,
	ZuoraGetInvoicePaymentQueryOutputResponseSchema,
	type ZuoraGetInvoicePaymentQueryOutputSchema,
	ZuoraGetInvoiceQueryOutputResponseSchema,
	type ZuoraGetInvoiceQueryOutputSchema,
	ZuoraGetPaymentQueryOutputResponseSchema,
	type ZuoraGetPaymentQueryOutputSchema,
} from '../zod-schemas';

export const zuoraGetInvoiceFromStripeChargeId = async (
	stripeChargeId: string,
	zuoraClient: ZuoraClient,
): Promise<ZuoraInvoiceFromStripeChargeIdResult> => {
	const paymentResponse: z.infer<
		typeof ZuoraGetPaymentQueryOutputResponseSchema
	> = await executeZoqlQuery(
		`SELECT id, referenceid, paymentnumber, status, accountid FROM Payment WHERE ReferenceID = '${stripeChargeId}' LIMIT 1`,
		zuoraClient,
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

	const foundPayment: z.infer<typeof ZuoraGetPaymentQueryOutputSchema> =
		paymentResponse.records[0];

	const paymentsInvoices: z.infer<
		typeof ZuoraGetInvoicePaymentQueryOutputResponseSchema
	> = await executeZoqlQuery(
		`SELECT invoiceid FROM InvoicePayment WHERE PaymentID = '${foundPayment.Id}'`,
		zuoraClient,
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

	const foundPaymentsInvoice: z.infer<
		typeof ZuoraGetInvoicePaymentQueryOutputSchema
	> = paymentsInvoices.records[0];

	const invoices: z.infer<typeof ZuoraGetInvoiceQueryOutputResponseSchema> =
		await executeZoqlQuery(
			`SELECT Id, InvoiceNumber, Status FROM Invoice WHERE id = '${foundPaymentsInvoice.InvoiceId}'`,
			zuoraClient,
			ZuoraGetInvoiceQueryOutputResponseSchema,
		);

	if (invoices.records.length === 0) {
		throw new Error(
			`No invoices found in Zuora with ReferenceID = '${foundPaymentsInvoice.InvoiceId}'`,
		);
	}

	if (invoices.records[0] == undefined) {
		throw new Error('invoices found but record is undefined');
	}

	const invoice: z.infer<typeof ZuoraGetInvoiceQueryOutputSchema> =
		invoices.records[0];

	const invoicesItems: z.infer<
		typeof ZuoraGetInvoiceItemQueryOutputResponseSchema
	> = await executeZoqlQuery(
		`SELECT Id, SubscriptionId, SubscriptionNumber FROM InvoiceItem WHERE InvoiceId = '${invoice.Id}'`,
		zuoraClient,
		ZuoraGetInvoiceItemQueryOutputResponseSchema,
	);

	if (invoicesItems.records.length === 0) {
		throw new Error(
			`No invoicesItems found in Zuora with ReferenceID = '${invoice.Id}'`,
		);
	}

	if (invoicesItems.records[0] == undefined) {
		throw new Error('invoicesItems found but record is undefined');
	}

	const invoiceItem: z.infer<typeof ZuoraGetInvoiceItemQueryOutputSchema> =
		invoicesItems.records[0];

	return {
		paymentId: foundPayment.Id,
		paymentStatus: foundPayment.Status,
		paymentPaymentNumber: foundPayment.PaymentNumber,
		paymentAccountId: foundPayment.AccountId,
		paymentReferenceId: foundPayment.ReferenceId,
		InvoiceId: foundPaymentsInvoice.InvoiceId,
		paymentsInvoiceId: foundPaymentsInvoice.Id,
		invoiceNumber: invoice.InvoiceNumber,
		invoiceStatus: invoice.Status,
		subscriptionId: invoiceItem.SubscriptionId,
		SubscriptionNumber: invoiceItem.SubscriptionNumber,
	} satisfies ZuoraInvoiceFromStripeChargeIdResult;
};
