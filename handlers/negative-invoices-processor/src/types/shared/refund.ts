import { zuoraResponseSchema } from '@modules/zuora/types';
import z from 'zod';
import { PaymentMethodSchema } from './paymentMethod';

export const RefundResponseSchema = zuoraResponseSchema.extend({
	Id: z.string().optional(),
});

export type RefundResponse = z.infer<typeof RefundResponseSchema>;

export const RefundResultSchema = RefundResponseSchema.extend({
	paymentMethod: PaymentMethodSchema.optional(),
	refundAmount: z.number().optional(),
});

export type RefundResult = z.infer<typeof RefundResultSchema>;
