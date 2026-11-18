import { z } from 'zod';
import { maxBy } from '@modules/arrayFunctions';
import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { SettlementPayment } from '../paymentSettlement';

export type InvoicePayment = SettlementPayment & {
	id: string;
	amount: number;
};

const invoicePaymentQueryResponseSchema = z.object({
	done: z.boolean(),
	records: z
		.array(z.object({ PaymentId: z.string(), CreatedDate: z.string() }))
		.default([]),
});

const paymentSchema = z.object({
	Id: z.string(),
	Amount: z.number(),
	Status: z.string(),
	GatewayState: z.string(),
	PaymentMethodId: z.string(),
});

const paymentMethodSchema = z.object({ Type: z.string() });

/**
 * Gets the most recent payment applied to an invoice, so a successful retry of a failed payment is the one that
 * counts. Returns undefined if the invoice has no payments.
 */
export async function getLatestInvoicePayment(
	zuoraClient: ZuoraClient,
	invoiceId: string,
): Promise<InvoicePayment | undefined> {
	const { done, records } = await doQuery(
		zuoraClient,
		`select PaymentId, CreatedDate from InvoicePayment where InvoiceId = '${invoiceId}'`,
		invoicePaymentQueryResponseSchema,
	);
	if (!done) {
		throw new Error(`Too many payments for invoice ${invoiceId}`);
	}
	const latest = maxBy(records, ({ CreatedDate }) => Date.parse(CreatedDate));
	if (latest === undefined) {
		return undefined;
	}
	const payment = await zuoraClient.get(
		`/v1/object/payment/${latest.PaymentId}`,
		paymentSchema,
	);
	const paymentMethod = await zuoraClient.get(
		`/v1/object/payment-method/${payment.PaymentMethodId}`,
		paymentMethodSchema,
	);
	return {
		id: payment.Id,
		amount: payment.Amount,
		status: payment.Status,
		gatewayState: payment.GatewayState,
		paymentMethodType: paymentMethod.Type,
	};
}
