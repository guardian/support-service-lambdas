import { zuoraResponseSchema } from '@modules/zuora/types';
import { z } from 'zod';
import { NewPaymentMethodSchema } from '.';

export const RefundResponseSchema = zuoraResponseSchema.extend({
	Id: z.string().optional(),
});

export type RefundResponse = z.infer<typeof RefundResponseSchema>;

export const RefundResultSchema = RefundResponseSchema.extend({
	refundAttempt: RefundResponseSchema,
	paymentMethod: NewPaymentMethodSchema.optional(),
	refundAmount: z.number().optional(),
	error: z.string().optional(),
});
