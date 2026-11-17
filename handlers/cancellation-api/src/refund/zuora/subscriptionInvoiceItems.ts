import { z } from 'zod';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { RefundInvoiceItem } from '../refundAmount';

const refundInvoiceItemSchema = z.object({
	Id: z.string(),
	InvoiceId: z.string(),
	ChargeDate: z.string(),
	ChargeAmount: z.number(),
	TaxAmount: z.number(),
}) satisfies z.ZodType<RefundInvoiceItem>;

const invoiceItemQueryResponseSchema = z.object({
	done: z.boolean(),
	records: z.array(refundInvoiceItemSchema).default([]),
});

export async function getSubscriptionInvoiceItems(
	zuoraClient: ZuoraClient,
	subscriptionNumber: SubscriptionNumber,
): Promise<RefundInvoiceItem[]> {
	const { done, records } = await doQuery(
		zuoraClient,
		`select Id, InvoiceId, ChargeDate, ChargeAmount, TaxAmount from InvoiceItem where SubscriptionNumber = '${subscriptionNumber}'`,
		invoiceItemQueryResponseSchema,
	);
	if (!done) {
		// a ZOQL query returns up to 2000 records per page; no subscription should have that many
		throw new Error(
			`Too many invoice items for subscription ${subscriptionNumber}`,
		);
	}
	return records;
}
