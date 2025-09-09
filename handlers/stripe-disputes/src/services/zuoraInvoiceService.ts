import { zuoraResponseSchema } from '@modules/zuora/types';
import type { ZuoraResponse } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';

/**
 * Writes off an invoice in Zuora using the Write Off Invoice API
 *
 * This function calls the Zuora REST API to write off an invoice, typically used when
 * a dispute is closed and the invoice needs to be written off as uncollectable.
 * The write-off creates a credit memo that balances the invoice to zero.
 *
 * @param zuoraClient - Zuora client instance
 * @param invoiceNumber - Invoice number or ID to write off (e.g., "INV-12345")
 * @param comment - Comment for the write-off transaction
 * @returns Zuora response indicating success/failure
 */
export async function writeOffInvoice(
	zuoraClient: ZuoraClient,
	invoiceNumber: string,
	comment: string,
): Promise<ZuoraResponse> {
	const path = `/v1/invoices/${invoiceNumber}/write-off`;
	const body = JSON.stringify({
		comment,
		memoDate: dayjs().format('YYYY-MM-DD'),
		reasonCode: 'Write-off', // Standard reason code for write-offs
	});

	return zuoraClient.put(path, body, zuoraResponseSchema);
}
