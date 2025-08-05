import { z } from 'zod';

export const ApplyCreditToAccountBalanceResponseSchema = z.object({
	Id: z.string().optional(),
});

export const ApplyCreditToAccountBalanceResultSchema = z.object({
	creditBalanceAdjustmentId: z.string().optional(),
	error: z.string().optional(),
});
