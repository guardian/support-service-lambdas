import { z } from 'zod';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { PermanentError } from '../permanentError';
import type { SubscriptionInvoiceItem } from '../subscriptionInvoiceItem';
import { subscriptionInvoiceItemSchema } from '../subscriptionInvoiceItem';

// The toPence function in subscriptionInvoiceItemSchema throws a PermanentError on a fraction of a penny.
// However if this occurs withing the zuoraClient it will be wrapped in a standard retryable error
// which we don't want, so parse it with a looser schema initially and then the stricter schema afterwards.
const invoiceItemQueryResponseSchema = z.object({
	done: z.boolean(),
	records: z
		.array(
			subscriptionInvoiceItemSchema.extend({
				ChargeAmount: z.number(),
				TaxAmount: z.number(),
			}),
		)
		.default([]),
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
		throw new PermanentError(
			`Too many invoice items for subscription ${subscriptionNumber}`,
		);
	}
	return records.map((record) => subscriptionInvoiceItemSchema.parse(record));
}
