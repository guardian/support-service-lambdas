import { z } from 'zod';

export const ApplyCreditToAccountBalanceResponseSchema = z.object({
	Id: z.string().optional(),
});

export const ApplyCreditToAccountBalanceResultSchema = z.object({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceResponseSchema,
	error: z.string().optional(),
});
