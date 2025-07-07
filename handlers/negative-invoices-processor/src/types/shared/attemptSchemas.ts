import { z } from 'zod';

export const PaymentMethodSchema = z.object({
	id: z.string(),
	status: z.string(),
	type: z.string(),
	isDefault: z.boolean(),
});

export const ApplyCreditToAccountBalanceAttemptSchema = z.object({
	Success: z.boolean(),
	error: z.string().optional(),
});

export const CheckForActiveSubAttemptSchema = z.object({
	Success: z.boolean(),
	hasActiveSub: z.boolean().optional(),
	error: z.string().optional(),
});

export const CheckForActivePaymentMethodAttemptSchema = z.object({
	Success: z.boolean(),
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(PaymentMethodSchema).optional(),
	error: z.string().optional(),
});

export const RefundAttemptSchema = z.object({
	Success: z.boolean(),
	paymentMethod: PaymentMethodSchema.optional(),
	refundAmount: z.number().optional(),
	error: z.string().optional(),
});
