import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import {
	orderNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getRefundKey } from '../refundKey';
import {
	createRefund as createZuoraRefund,
	getRefund,
	getRefundsByComment,
} from '../zuora/refund';

const createRefundInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	cancellationOrderNumber: orderNumberSchema,
	paymentId: z.string().min(1),
	refundAmount: z.number().positive(),
});

export type CreateRefundOutput = {
	refundId: string;
};

export const handler = async (event: unknown): Promise<CreateRefundOutput> => {
	const input = createRefundInputSchema.parse(event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	return createRefund(zuoraClient, {
		refundKey: getRefundKey(input),
		paymentId: input.paymentId,
		refundAmount: input.refundAmount,
	});
};

/**
 * Refunds the payment, unless a refund with this refundKey as its comment already exists. Fails unless the refund is
 * Processed, so a refund that is still processing is checked again on retry rather than created twice.
 */
export async function createRefund(
	zuoraClient: ZuoraClient,
	{
		refundKey,
		paymentId,
		refundAmount,
	}: { refundKey: string; paymentId: string; refundAmount: number },
): Promise<CreateRefundOutput> {
	const existingRefunds = await getRefundsByComment(zuoraClient, refundKey);
	if (existingRefunds.length > 1) {
		throw new Error(
			`Found ${existingRefunds.length} refunds with comment ${refundKey}, expected at most one`,
		);
	}
	const [existingRefund] = existingRefunds;
	if (existingRefund !== undefined) {
		logger.log(`Refund ${existingRefund.id} already exists`, existingRefund);
	}
	const refundId =
		existingRefund?.id ??
		(await createZuoraRefund({
			zuoraClient,
			paymentId,
			amount: refundAmount,
			comment: refundKey,
		}));

	const refund = existingRefund ?? (await getRefund(zuoraClient, refundId));
	if (refund.amount !== refundAmount) {
		throw new Error(
			`Refund ${refundId} is for ${refund.amount}, expected ${refundAmount}`,
		);
	}
	if (refund.status !== 'Processed') {
		throw new Error(
			`Refund ${refundId} has status ${refund.status}, expected Processed`,
		);
	}
	return { refundId };
}
