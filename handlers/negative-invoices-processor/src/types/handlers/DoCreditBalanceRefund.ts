import { z } from 'zod';
import { RefundAttemptSchema } from '../shared';
import { GetPaymentMethodsOutputSchema } from './GetPaymentMethods';

export const DoCreditBalanceRefundInputSchema = GetPaymentMethodsOutputSchema;
export type DoCreditBalanceRefundInput = z.infer<
	typeof DoCreditBalanceRefundInputSchema
>;

export const DoCreditBalanceRefundOutputSchema =
	DoCreditBalanceRefundInputSchema.extend({
		refundAttempt: RefundAttemptSchema,
	});
export type DoCreditBalanceRefundOutput = z.infer<
	typeof DoCreditBalanceRefundOutputSchema
>;
