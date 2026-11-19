import dayjs from 'dayjs';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import {
	orderNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getRefundKey } from '../refundKey';
import { zeroInvoice } from '../zuora/zeroInvoice';

const balanceInvoicesInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	cancellationOrderNumber: orderNumberSchema,
	// the refunded invoice, or the unpaid invoice after backdating
	paidInvoiceId: z.string().min(1),
	// the cancellation invoice, or the credit invoice after backdating
	negativeInvoiceId: z.string().min(1),
});

/**
 * Brings the paid and negative invoice balances to zero. A retry skips an invoice that is already zero.
 */
export const handler = async (
	event: unknown,
): Promise<Record<string, never>> => {
	const input = balanceInvoicesInputSchema.parse(event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	for (const invoiceId of [input.paidInvoiceId, input.negativeInvoiceId]) {
		await zeroInvoice({
			zuoraClient,
			invoiceId,
			adjustmentDate: dayjs(),
			comment: getRefundKey(input),
		});
	}
	return {};
};
