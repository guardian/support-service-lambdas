import type { z } from 'zod';
import {
	ApplyCreditToAccountBalanceResultSchema,
	type InvoiceRecord,
	InvoiceSchema,
} from '../shared';

const ApplyCreditToAccountBalanceInputSchema = InvoiceSchema;
export type ApplyCreditToAccountBalanceInput = InvoiceRecord;

export const ApplyCreditToAccountBalanceOutputSchema =
	ApplyCreditToAccountBalanceInputSchema.extend({
		applyCreditToAccountBalanceResult: ApplyCreditToAccountBalanceResultSchema,
	});

export type ApplyCreditToAccountBalanceOutput = z.infer<
	typeof ApplyCreditToAccountBalanceOutputSchema
>;
