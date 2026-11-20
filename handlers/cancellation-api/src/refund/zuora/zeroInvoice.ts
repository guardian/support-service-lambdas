import type { Dayjs } from 'dayjs';
import { logger } from '@modules/logger/logger';
import {
	creditInvoice,
	getInvoice,
	getInvoiceItems,
} from '@modules/zuora/invoice';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zeroInvoiceAdjustments } from '../zeroInvoiceAdjustments';

/**
 * Brings an invoice's balance to zero with invoice item adjustments. Safe to re-run: an invoice that is already
 * zero is left alone, and a partly adjusted one is finished off.
 */
export async function zeroInvoice({
	zuoraClient,
	invoiceId,
	adjustmentDate,
	comment,
}: {
	zuoraClient: ZuoraClient;
	invoiceId: string;
	adjustmentDate: Dayjs;
	comment: string;
}): Promise<void> {
	const { balance } = await getInvoice(zuoraClient, invoiceId);
	if (balance === 0) {
		logger.log(`Invoice ${invoiceId} already has a zero balance`);
		return;
	}
	const { invoiceItems } = await getInvoiceItems(zuoraClient, invoiceId);
	const adjustments = zeroInvoiceAdjustments({
		invoiceItems,
		expectedTotal: balance,
	});
	logger.log(`Adjusting invoice ${invoiceId} to zero`, adjustments);
	for (const { SourceId, Amount, Type, SourceType } of adjustments) {
		await creditInvoice(
			adjustmentDate,
			zuoraClient,
			invoiceId,
			SourceId,
			Amount,
			Type,
			SourceType,
			comment,
		);
	}
}
