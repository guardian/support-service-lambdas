import {
	BasePaymentMethodSchema,
	zuoraResponseSchema,
} from '@modules/zuora/types';
import { z } from 'zod';

//todo update this name (remove 'New') when duplicate schema is removed from
//handlers/negative-invoices-processor/src/types/handlers/GetPaymentMethods.ts
export const PaymentMethodSchema = z.object({
	...BasePaymentMethodSchema.pick({
		id: true,
		status: true,
		type: true,
		isDefault: true,
	}).shape,
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentMethodResponseSchema = z.intersection(
	zuoraResponseSchema,
	z.object({
		creditcard: z.array(PaymentMethodSchema).optional(),
		creditcardreferencetransaction: z.array(PaymentMethodSchema).optional(),
		banktransfer: z.array(PaymentMethodSchema).optional(),
		paypal: z.array(PaymentMethodSchema).optional(),
	}),
);
export type PaymentMethodResponse = z.infer<typeof PaymentMethodResponseSchema>;

export const PaymentMethodResultSchema = z.object({
	checkForActivePaymentMethodAttempt: PaymentMethodResponseSchema,
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(PaymentMethodSchema).optional(),
	error: z.string().optional(),
});
