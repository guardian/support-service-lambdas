import { z } from 'zod';
import { PaymentMethodSchema } from '.';

export const RefundResponseSchema = z.object({
	Id: z.string().optional(),
});

export type RefundResponse = z.infer<typeof RefundResponseSchema>;

export const RefundResultSchema = z.object({
	refundAttempt: RefundResponseSchema.optional(),
	paymentMethod: PaymentMethodSchema.optional(),
	refundAmount: z.number().optional(),
	error: z.string().optional(),
});
