import {
	BasePaymentMethodSchema,
	zuoraResponseSchema,
} from '@modules/zuora/types';
import { z } from 'zod';

//todo update this name (remove 'New') when duplicate schema is removed from
//handlers/negative-invoices-processor/src/types/handlers/GetPaymentMethods.ts
export const NewPaymentMethodSchema = z.object({
	...BasePaymentMethodSchema.pick({
		id: true,
		status: true,
		type: true,
		isDefault: true,
	}).shape,
});

export type PaymentMethod = z.infer<typeof NewPaymentMethodSchema>;

export const PaymentMethodResponseSchema = zuoraResponseSchema.extend({
	creditcard: z.array(NewPaymentMethodSchema).optional(),
	creditcardreferencetransaction: z.array(NewPaymentMethodSchema).optional(),
	banktransfer: z.array(NewPaymentMethodSchema).optional(),
	paypal: z.array(NewPaymentMethodSchema).optional(),
});

export type PaymentMethodResponse = z.infer<typeof PaymentMethodResponseSchema>;

export const PaymentMethodResultSchema = z.object({
	checkForActivePaymentMethodAttempt: PaymentMethodResponseSchema,
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(NewPaymentMethodSchema).optional(),
	error: z.string().optional(),
});
