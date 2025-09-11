import { zuoraResponseSchema } from '@modules/zuora/types';
import type { ZuoraResponse } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';

export async function writeOffInvoice(
	zuoraClient: ZuoraClient,
	invoiceNumber: string,
	comment: string,
): Promise<ZuoraResponse> {
	const path = `/v1/invoices/${invoiceNumber}/write-off`;
	const body = JSON.stringify({
		comment,
		memoDate: dayjs().format('YYYY-MM-DD'),
		reasonCode: 'Write-off',
	});

	return zuoraClient.put(path, body, zuoraResponseSchema);
}
