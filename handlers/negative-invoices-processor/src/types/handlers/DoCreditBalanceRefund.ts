import type { z } from 'zod';
import { RefundResultSchema } from '../shared';
import { GetPaymentMethodsOutputSchema } from './GetPaymentMethods';

export const DoCreditBalanceRefundInputSchema = GetPaymentMethodsOutputSchema;
export type DoCreditBalanceRefundInput = z.infer<
	typeof DoCreditBalanceRefundInputSchema
>;

export const DoCreditBalanceRefundOutputSchema =
	DoCreditBalanceRefundInputSchema.extend({
		refundResult: RefundResultSchema,
	});
export type DoCreditBalanceRefundOutput = z.infer<
	typeof DoCreditBalanceRefundOutputSchema
>;
