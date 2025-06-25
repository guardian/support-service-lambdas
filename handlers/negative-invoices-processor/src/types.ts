import { z } from 'zod';

export const InvoiceSchema = z
	.object({
		invoiceId: z.string(),
		accountId: z.string(),
		invoiceNumber: z.string(),
		invoiceBalance: z.number(),
	})
	.strict();
export type InvoiceRecord = z.infer<typeof InvoiceSchema>;

export const InvoiceRecordsArraySchema = z.array(InvoiceSchema);

export const PaymentMethodSchema = z.object({
	id: z.string(),
	status: z.string(),
	type: z.string(),
	isDefault: z.boolean(),
});

export const ApplyCreditToAccountBalanceAttemptSchema = z.object({
	Success: z.boolean(),
});

export const RefundAttemptSchema = z.object({
	Success: z.boolean(),
	paymentMethod: PaymentMethodSchema.optional(),
});

export const ProcessedInvoiceSchema = z.object({
	accountId: z.string(),
	invoiceId: z.string(),
	invoiceNumber: z.string(),
	invoiceBalance: z.number(),
	hasActiveSub: z.boolean().optional(),
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(PaymentMethodSchema).optional(),
	refundAttempt: RefundAttemptSchema.optional(),
	errorDetail: z.string().optional(),
});
