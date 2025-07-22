import { zuoraResponseSchema } from '@modules/zuora/types';
import z from 'zod';

export const PaymentMethodSchema = z.object({
	id: z.string(),
	status: z.string(),
	type: z.string(),
	isDefault: z.boolean(),
});
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentMethodResponseSchema = zuoraResponseSchema.extend({
	creditcardreferencetransaction: z.array(PaymentMethodSchema).optional(),
	creditcard: z.array(PaymentMethodSchema).optional(),
	banktransfer: z.array(PaymentMethodSchema).optional(),
	paypal: z.array(PaymentMethodSchema).optional(),
});
export type PaymentMethodResponse = z.infer<typeof PaymentMethodResponseSchema>;

export const PaymentMethodResultSchema = PaymentMethodResponseSchema.extend({
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(PaymentMethodSchema).optional(),
	error: z.string().optional(),
});
export type PaymentMethodResult = z.infer<typeof PaymentMethodResultSchema>;
