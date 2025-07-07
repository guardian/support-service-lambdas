import { z } from 'zod';
import {
	InvoiceSchema,
	type InvoiceRecord,
	ApplyCreditToAccountBalanceAttemptSchema,
} from '../shared';

export const ApplyCreditToAccountBalanceInputSchema = InvoiceSchema;
export type ApplyCreditToAccountBalanceInput = InvoiceRecord;

export const ApplyCreditToAccountBalanceOutputSchema =
	ApplyCreditToAccountBalanceInputSchema.extend({
		applyCreditToAccountBalanceAttempt:
			ApplyCreditToAccountBalanceAttemptSchema,
	});

export type ApplyCreditToAccountBalanceOutput = z.infer<
	typeof ApplyCreditToAccountBalanceOutputSchema
>;
