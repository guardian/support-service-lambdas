import { z } from 'zod';
import {
	ApplyCreditToAccountBalanceOutput,
	ApplyCreditToAccountBalanceOutputSchema,
} from './ApplyCreditToAccountBalance';

// CheckForActiveSub lambda
export const CheckForActiveSubInputSchema =
	ApplyCreditToAccountBalanceOutputSchema;
export type CheckForActiveSubInput = ApplyCreditToAccountBalanceOutput;

export const CheckForActiveSubAttemptSchema = z.object({
	Success: z.boolean(),
	hasActiveSub: z.boolean().optional(),
	error: z.string().optional(),
});

export const CheckForActiveSubOutputSchema =
	CheckForActiveSubInputSchema.extend({
		checkForActiveSubAttempt: CheckForActiveSubAttemptSchema,
	});

export type CheckForActiveSubOutput = z.infer<
	typeof CheckForActiveSubOutputSchema
>;
