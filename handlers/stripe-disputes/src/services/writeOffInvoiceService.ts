import type { Logger } from '@modules/routing/logger';
import { writeOffInvoice } from '@modules/zuora/invoice';
import type { ZuoraResponse } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export async function writeOffInvoiceService(
	logger: Logger,
	zuoraClient: ZuoraClient,
	invoiceId: string | undefined,
	disputeId: string,
): Promise<boolean> {
	if (!invoiceId) {
		logger.log('No invoice ID found, skipping invoice write-off');
		return false;
	}

	logger.log(`Writing off invoice: ${invoiceId}`);
	const writeOffResponse: ZuoraResponse = await writeOffInvoice(
		zuoraClient,
		invoiceId,
		`Invoice write-off due to Stripe dispute closure. Dispute ID: ${disputeId}`,
	);

	logger.log('Invoice write-off response:', JSON.stringify(writeOffResponse));

	return true;
}
