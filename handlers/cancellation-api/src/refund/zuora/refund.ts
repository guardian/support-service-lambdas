import { z } from 'zod';
import { doQuery } from '@modules/zuora/query';
import { doRefund } from '@modules/zuora/refund';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { PermanentError } from '../permanentError';

export type Refund = {
	id: string;
	amount: number;
	status: string;
};

const refundRecordSchema = z.object({
	Id: z.string(),
	Amount: z.number(),
	Status: z.string(),
});

const toRefund = ({
	Id,
	Amount,
	Status,
}: z.infer<typeof refundRecordSchema>) => ({
	id: Id,
	amount: Amount,
	status: Status,
});

const refundQueryResponseSchema = z.object({
	done: z.boolean(),
	records: z.array(refundRecordSchema).default([]),
});

const createRefundResponseSchema = z.object({
	Success: z.literal(true),
	Id: z.string(),
});

/**
 * Refunds a payment to the payment method it was taken from.
 * The comment identifies the refund, so a re-run of the lambda
 * can find it with getRefundsByComment.
 */
export async function createRefund({
	zuoraClient,
	paymentId,
	amount,
	comment,
}: {
	zuoraClient: ZuoraClient;
	paymentId: string;
	amount: number;
	comment: string;
}): Promise<string> {
	const { Id } = await doRefund(
		zuoraClient,
		JSON.stringify({
			Amount: amount,
			Comment: comment,
			PaymentId: paymentId,
			Type: 'Electronic',
		}),
		createRefundResponseSchema,
	);
	return Id;
}

export async function getRefund(
	zuoraClient: ZuoraClient,
	refundId: string,
): Promise<Refund> {
	return toRefund(
		await zuoraClient.get(`/v1/object/refund/${refundId}`, refundRecordSchema),
	);
}

export async function getRefundsByComment(
	zuoraClient: ZuoraClient,
	comment: string,
): Promise<Refund[]> {
	const { done, records } = await doQuery(
		zuoraClient,
		`select Id, Amount, Status from Refund where Comment = '${comment}'`,
		refundQueryResponseSchema,
	);
	if (!done) {
		throw new PermanentError(`Too many refunds with comment ${comment}`);
	}
	return records.map(toRefund);
}
