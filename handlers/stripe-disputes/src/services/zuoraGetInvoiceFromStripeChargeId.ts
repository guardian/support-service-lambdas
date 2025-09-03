import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { z } from 'zod';
import type { ZuoraInvoiceFromStripeChargeIdResult } from '../interfaces';
import {
	ZuoraGetInvoiceItemQueryOutputResponseSchema,
	type ZuoraGetInvoiceItemQueryOutputSchema,
	ZuoraGetInvoicePaymentQueryOutputResponseSchema,
	type ZuoraGetInvoicePaymentQueryOutputSchema,
	ZuoraGetPaymentQueryOutputResponseSchema,
	type ZuoraGetPaymentQueryOutputSchema,
} from '../zod-schemas';

export const zuoraGetInvoiceFromStripeChargeId = async (
	stripeChargeId: string,
	zuoraClient: ZuoraClient,
): Promise<ZuoraInvoiceFromStripeChargeIdResult> => {
	const paymentResponse: z.infer<
		typeof ZuoraGetPaymentQueryOutputResponseSchema
	> = await doQuery(
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

	const foundPayment: z.infer<typeof ZuoraGetPaymentQueryOutputSchema> =
		paymentResponse.records[0];

	const paymentsInvoices: z.infer<
		typeof ZuoraGetInvoicePaymentQueryOutputResponseSchema
	> = await doQuery(
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

	const foundPaymentsInvoice: z.infer<
		typeof ZuoraGetInvoicePaymentQueryOutputSchema
	> = paymentsInvoices.records[0];

	const invoicesItems: z.infer<
		typeof ZuoraGetInvoiceItemQueryOutputResponseSchema
	> = await doQuery(
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

	const invoiceItem:
		| z.infer<typeof ZuoraGetInvoiceItemQueryOutputSchema>
		| undefined = invoicesItems.records.filter((item) => {
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
