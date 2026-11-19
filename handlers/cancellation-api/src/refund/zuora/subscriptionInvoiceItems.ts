import { z } from 'zod';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { SubscriptionInvoiceItem } from '../subscriptionInvoiceItem';
import { subscriptionInvoiceItemSchema } from '../subscriptionInvoiceItem';

const invoiceItemQueryResponseSchema = z.object({
	done: z.boolean(),
	records: z.array(subscriptionInvoiceItemSchema).default([]),
});

export async function getSubscriptionInvoiceItems(
	zuoraClient: ZuoraClient,
	subscriptionNumber: SubscriptionNumber,
): Promise<SubscriptionInvoiceItem[]> {
	const { done, records } = await doQuery(
		zuoraClient,
		`select Id, InvoiceId, ChargeDate, ChargeAmount, TaxAmount from InvoiceItem where SubscriptionNumber = '${subscriptionNumber}'`,
		invoiceItemQueryResponseSchema,
	);
	if (!done) {
		// a ZOQL query returns up to 2000 records per page, throw if there are more invoice items than that
		throw new Error(
			`Too many invoice items for subscription ${subscriptionNumber}`,
		);
	}
	return records;
}
