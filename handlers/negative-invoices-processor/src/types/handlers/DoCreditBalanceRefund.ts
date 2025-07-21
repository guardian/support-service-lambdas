import { z } from 'zod';
import { GetPaymentMethodsOutputSchema } from './GetPaymentMethods';
import { PaymentMethodSchema } from './GetPaymentMethods';
import { RefundResponseSchema } from '../shared/refund';

export const DoCreditBalanceRefundInputSchema = GetPaymentMethodsOutputSchema;
export type DoCreditBalanceRefundInput = z.infer<
	typeof DoCreditBalanceRefundInputSchema
>;

export const DoCreditBalanceRefundOutputSchema =
	DoCreditBalanceRefundInputSchema.extend({
		refundAttempt: RefundResponseSchema,
		paymentMethod: PaymentMethodSchema.optional(),
		refundAmount: z.number().optional(),
	});
export type DoCreditBalanceRefundOutput = z.infer<
	typeof DoCreditBalanceRefundOutputSchema
>;
