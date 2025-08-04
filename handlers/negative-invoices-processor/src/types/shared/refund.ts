import { zuoraResponseSchema } from '@modules/zuora/types';
import { z } from 'zod';
import { PaymentMethodSchema } from '.';

export const RefundResponseSchema = z.intersection(
	zuoraResponseSchema,
	z.object({
		Id: z.string().optional(),
	}),
);
export type RefundResponse = z.infer<typeof RefundResponseSchema>;

export const RefundResultSchema = z.intersection(
	RefundResponseSchema,
	z.object({
		refundAttempt: RefundResponseSchema,
		paymentMethod: PaymentMethodSchema.optional(),
		refundAmount: z.number().optional(),
		error: z.string().optional(),
	}),
);
