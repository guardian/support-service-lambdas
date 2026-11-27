import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { z } from 'zod';
import { sortBy } from '@modules/arrayFunctions';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { PermanentError } from '../permanentError';

const serviceStartDateQueryResponseSchema = z.object({
	done: z.boolean(),
	records: z.array(z.object({ ServiceStartDate: z.string() })).default([]),
});

/**
 * The start of the earliest period the subscription's items on an invoice pay for.
 */
export async function getInvoiceServiceStartDate(
	zuoraClient: ZuoraClient,
	subscriptionNumber: SubscriptionNumber,
	invoiceId: string,
): Promise<Dayjs> {
	const { done, records } = await doQuery(
		zuoraClient,
		`select ServiceStartDate from InvoiceItem where InvoiceId = '${invoiceId}' and SubscriptionNumber = '${subscriptionNumber}'`,
		serviceStartDateQueryResponseSchema,
	);
	if (!done) {
		throw new PermanentError(
			`Too many items on invoice ${invoiceId} for subscription ${subscriptionNumber}`,
		);
	}
	const earliest = sortBy(
		records,
		({ ServiceStartDate }) => ServiceStartDate,
	)[0];
	if (earliest === undefined) {
		throw new PermanentError(
			`Invoice ${invoiceId} has no items for subscription ${subscriptionNumber}`,
		);
	}
	return dayjs(earliest.ServiceStartDate);
}
