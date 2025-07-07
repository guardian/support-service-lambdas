import { z } from 'zod';
import { InvoiceSchema, type InvoiceRecord } from '../shared';

const ApplyCreditToAccountBalanceInputSchema = InvoiceSchema;
export type ApplyCreditToAccountBalanceInput = InvoiceRecord;

export const ApplyCreditToAccountBalanceAttemptSchema = z.object({
	Success: z.boolean(),
	error: z.string().optional(),
});

export const ApplyCreditToAccountBalanceOutputSchema =
	ApplyCreditToAccountBalanceInputSchema.extend({
		applyCreditToAccountBalanceAttempt:
			ApplyCreditToAccountBalanceAttemptSchema,
	});

export type ApplyCreditToAccountBalanceOutput = z.infer<
	typeof ApplyCreditToAccountBalanceOutputSchema
>;
