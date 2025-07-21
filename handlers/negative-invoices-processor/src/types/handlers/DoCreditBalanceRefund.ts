import { z } from 'zod';
import { GetPaymentMethodsOutputSchema } from './GetPaymentMethods';
import { RefundResultSchema } from '../shared/refund';

export const DoCreditBalanceRefundInputSchema =
	GetPaymentMethodsOutputSchema.strict();
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
