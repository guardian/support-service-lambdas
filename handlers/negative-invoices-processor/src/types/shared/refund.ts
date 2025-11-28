import { z } from 'zod';
import { PaymentMethodSchema } from './paymentMethod';
import { successOrFailureSchema } from './successOrFailureSchema';

export const RefundResponseSchema = successOrFailureSchema.extend({
	Id: z.string().optional(),
});

export type RefundResponse = z.infer<typeof RefundResponseSchema>;

export const RefundResultSchema = RefundResponseSchema.extend({
	refundAttempt: RefundResponseSchema,
	paymentMethod: PaymentMethodSchema.optional(),
	refundAmount: z.number().optional(),
	error: z.string().optional(),
});
