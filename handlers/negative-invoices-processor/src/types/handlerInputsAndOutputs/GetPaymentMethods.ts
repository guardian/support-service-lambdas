import { z } from 'zod';
import {
	CheckForActiveSubOutput,
	CheckForActiveSubOutputSchema,
} from './index';

export const GetPaymentMethodsInputSchema = CheckForActiveSubOutputSchema;
export type GetPaymentMethodsInput = CheckForActiveSubOutput;

export const PaymentMethodSchema = z.object({
	id: z.string(),
	status: z.string(),
	type: z.string(),
	isDefault: z.boolean(),
});

export const CheckForActivePaymentMethodAttemptSchema = z.object({
	Success: z.boolean(),
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(PaymentMethodSchema).optional(),
	error: z.string().optional(),
});
export const GetPaymentMethodsOutputSchema =
	GetPaymentMethodsInputSchema.extend({
		checkForActivePaymentMethodAttempt:
			CheckForActivePaymentMethodAttemptSchema,
	});
export type GetPaymentMethodsOutput = z.infer<
	typeof GetPaymentMethodsOutputSchema
>;
