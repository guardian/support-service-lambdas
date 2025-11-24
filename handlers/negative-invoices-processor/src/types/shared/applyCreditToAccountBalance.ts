import { z } from 'zod';
import { successOrFailureSchema } from './successOrFailureSchema';

export const ApplyCreditToAccountBalanceResponseSchema =
	successOrFailureSchema.extend({
		Id: z.string().optional(),
	});

export const ApplyCreditToAccountBalanceResultSchema = z.object({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceResponseSchema,
	error: z.string().optional(),
});
