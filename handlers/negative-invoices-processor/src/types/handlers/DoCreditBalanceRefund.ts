import { z } from 'zod';
import { GetPaymentMethodsOutputSchema } from './GetPaymentMethods';
import { zuoraResponseSchema } from '@modules/zuora/types/zuoraClient';
import { PaymentMethodSchema } from './GetPaymentMethods';

export const DoCreditBalanceRefundInputSchema = GetPaymentMethodsOutputSchema;
export type DoCreditBalanceRefundInput = z.infer<
	typeof DoCreditBalanceRefundInputSchema
>;

export const RefundResponseSchema = zuoraResponseSchema.extend({
	Id: z.string().optional(),
});

export type RefundResponse = z.infer<typeof RefundResponseSchema>;

export const DoCreditBalanceRefundOutputSchema =
	DoCreditBalanceRefundInputSchema.extend({
		refundAttempt: RefundResponseSchema,
		paymentMethod: PaymentMethodSchema.optional(),
		refundAmount: z.number().optional(),
	});
export type DoCreditBalanceRefundOutput = z.infer<
	typeof DoCreditBalanceRefundOutputSchema
>;
