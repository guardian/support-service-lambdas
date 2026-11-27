import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { RefundAmount } from '../refundAmount';
import { calculateRefundAmount } from '../refundAmount';
import { getSubscriptionInvoiceItems } from '../zuora/subscriptionInvoiceItems';
import { parseStepInput } from './stepInput';

const calculateRefundInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	negativeInvoiceId: z.string().min(1),
});

type CalculateRefundInput = z.infer<typeof calculateRefundInputSchema>;

export const handler = async (event: unknown): Promise<RefundAmount> => {
	const input = parseStepInput(calculateRefundInputSchema, event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	return calculateRefund(zuoraClient, input);
};

export async function calculateRefund(
	zuoraClient: ZuoraClient,
	{ subscriptionNumber, negativeInvoiceId }: CalculateRefundInput,
): Promise<RefundAmount> {
	const invoiceItems = await getSubscriptionInvoiceItems(
		zuoraClient,
		subscriptionNumber,
	);
	const refund = calculateRefundAmount({ negativeInvoiceId, invoiceItems });
	logger.log('Calculated refund', refund);
	return refund;
}
