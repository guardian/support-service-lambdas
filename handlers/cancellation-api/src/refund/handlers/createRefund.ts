import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import {
	orderNumberSchema,
	subscriptionNumberSchema,
} from '@modules/zuora/identifiers';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { toPence } from '../money';
import { PermanentError } from '../permanentError';
import { getRefundKey } from '../refundKey';
import { getPaymentInvoiceIds } from '../zuora/invoicePayment';
import {
	createRefund as createZuoraRefund,
	getRefund,
	getRefundsByComment,
} from '../zuora/refund';
import { parseStepInput } from './stepInput';

const createRefundInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	cancellationOrderNumber: orderNumberSchema,
	invoiceId: z.string().min(1),
	// missing if the invoice was paid from credit balance
	paymentId: z.string().min(1).optional(),
	paymentAmount: z.number().optional(),
	refundAmount: z.number().positive(),
});

export type CreateRefundOutput = {
	refundId: string;
};

export const handler = async (event: unknown): Promise<CreateRefundOutput> => {
	const input = parseStepInput(createRefundInputSchema, event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	return createRefund(zuoraClient, {
		refundKey: getRefundKey(input),
		invoiceId: input.invoiceId,
		paymentId: getRefundablePaymentId(input),
		refundAmount: input.refundAmount,
	});
};

/**
 * An invoice paid wholly or partly from credit balance can't be refunded in full to the payment
 * method, so this fails rather than asking Zuora to refund more than was paid.
 */
export function getRefundablePaymentId({
	invoiceId,
	paymentId,
	paymentAmount,
	refundAmount,
}: {
	invoiceId: string;
	paymentId?: string;
	paymentAmount?: number;
	refundAmount: number;
}): string {
	if (paymentId === undefined || paymentAmount === undefined) {
		throw new PermanentError(
			`Invoice ${invoiceId} has no payment to refund, it may have been paid from credit balance`,
		);
	}
	if (toPence(refundAmount) > toPence(paymentAmount)) {
		throw new PermanentError(
			`Refund of ${refundAmount} is more than payment ${paymentId} of ${paymentAmount} for invoice ${invoiceId}, the rest may have been paid from credit balance`,
		);
	}
	return paymentId;
}

/**
 * Refunds the payment, unless a refund with this refundKey as its comment already exists. Fails if the refund is still
 * Processing, so it is checked again on retry rather than created twice.
 */
export async function createRefund(
	zuoraClient: ZuoraClient,
	{
		refundKey,
		invoiceId,
		paymentId,
		refundAmount,
	}: {
		refundKey: string;
		invoiceId: string;
		paymentId: string;
		refundAmount: number;
	},
): Promise<CreateRefundOutput> {
	const existingRefunds = await getRefundsByComment(zuoraClient, refundKey);
	if (existingRefunds.length > 1) {
		throw new PermanentError(
			`Found ${existingRefunds.length} refunds with comment ${refundKey}, expected at most one`,
		);
	}
	const [existingRefund] = existingRefunds;
	if (existingRefund !== undefined) {
		logger.log(
			`Refund ${existingRefund.id} with comment ${refundKey} already exists, so not refunding again`,
			existingRefund,
		);
	}
	if (existingRefund === undefined) {
		await checkPaymentOnlyForInvoice(zuoraClient, paymentId, invoiceId);
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
		throw new PermanentError(
			`Refund ${refundId} is for ${refund.amount}, expected ${refundAmount}`,
		);
	}
	if (refund.status === 'Processing') {
		throw new Error(`Refund ${refundId} is still processing`);
	}
	if (refund.status !== 'Processed') {
		throw new PermanentError(
			`Refund ${refundId} has status ${refund.status}, expected Processed`,
		);
	}
	return { refundId };
}

/**
 * A refund is taken from the payment without saying which invoice it is for, so Zuora chooses. If the payment was
 * also applied to another invoice, for example one for another subscription collected in the same payment run, the
 * refund could reopen that invoice instead.
 */
async function checkPaymentOnlyForInvoice(
	zuoraClient: ZuoraClient,
	paymentId: string,
	invoiceId: string,
): Promise<void> {
	const invoiceIds = await getPaymentInvoiceIds(zuoraClient, paymentId);
	if (invoiceIds.some((id) => id !== invoiceId)) {
		throw new PermanentError(
			`Payment ${paymentId} was applied to invoices ${invoiceIds.join(', ')}, not just invoice ${invoiceId}`,
		);
	}
}
