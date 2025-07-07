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

export type ApplyCreditToAccountBalanceInput = InvoiceRecord;

export const ApplyCreditToAccountBalanceAttemptSchema = z.object({
	Success: z.boolean(),
	error: z.string().optional(),
});

export const ApplyCreditToAccountBalanceOutputSchema = InvoiceSchema.extend({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceAttemptSchema,
});

export type ApplyCreditToAccountBalanceOutput = z.infer<
	typeof ApplyCreditToAccountBalanceOutputSchema
>;
