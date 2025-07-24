import { z } from 'zod';
import {
	ApplyCreditToAccountBalanceResultSchema,
	InvoiceSchema,
	type InvoiceRecord,
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
