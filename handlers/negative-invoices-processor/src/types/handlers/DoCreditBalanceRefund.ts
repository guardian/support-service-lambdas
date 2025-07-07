import { z } from 'zod';
import {
	GetPaymentMethodsOutputSchema,
	PaymentMethodSchema,
} from './GetPaymentMethods';

export const DoCreditBalanceRefundInputSchema = GetPaymentMethodsOutputSchema;
export type DoCreditBalanceRefundInput = z.infer<
	typeof DoCreditBalanceRefundInputSchema
>;

export const RefundAttemptSchema = z.object({
	Success: z.boolean(),
	paymentMethod: PaymentMethodSchema.optional(),
	refundAmount: z.number().optional(),
	error: z.string().optional(),
});

export const DoCreditBalanceRefundOutputSchema =
	DoCreditBalanceRefundInputSchema.extend({
		refundAttempt: RefundAttemptSchema,
	});
export type DoCreditBalanceRefundOutput = z.infer<
	typeof DoCreditBalanceRefundOutputSchema
>;
