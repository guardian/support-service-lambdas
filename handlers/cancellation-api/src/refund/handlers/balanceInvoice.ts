import dayjs from 'dayjs';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zeroInvoice } from '../zuora/zeroInvoice';

const balanceInvoiceInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	refundKey: z.string().min(1),
	invoiceId: z.string().min(1),
});

/**
 * Brings an invoice's balance to zero: the paid invoice after a refund, the negative invoice from the cancellation,
 * or an unpaid invoice and its credit invoice after backdating.
 */
export const handler = async (event: unknown): Promise<void> => {
	const { subscriptionNumber, refundKey, invoiceId } =
		balanceInvoiceInputSchema.parse(event);
	logger.resetContext();
	logger.mutableAddContext(subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	await zeroInvoice({
		zuoraClient,
		invoiceId,
		adjustmentDate: dayjs(),
		comment: refundKey,
	});
};
