import {
	BasePaymentMethodSchema,
	DefaultPaymentMethodResponseSchema,
	zuoraResponseSchema,
} from '@modules/zuora/types';
import { z } from 'zod';

export const PaymentMethodSchema = z.object({
	...BasePaymentMethodSchema.pick({
		id: true,
		status: true,
		type: true,
		isDefault: true,
	}).shape,
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentMethodResponseSchema = zuoraResponseSchema.extend(
	DefaultPaymentMethodResponseSchema.pick({
		creditcard: true,
		creditcardreferencetransaction: true,
		banktransfer: true,
		paypal: true,
	}).shape,
);
export type PaymentMethodResponse = z.infer<typeof PaymentMethodResponseSchema>;

export const PaymentMethodResultSchema = z.object({
	checkForActivePaymentMethodAttempt: PaymentMethodResponseSchema,
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(PaymentMethodSchema).optional(),
	error: z.string().optional(),
});
