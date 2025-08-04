import { zuoraResponseSchema } from '@modules/zuora/types';
import { z } from 'zod';

export const ApplyCreditToAccountBalanceResponseSchema = z.intersection(
	zuoraResponseSchema,
	z.object({
		Id: z.string().optional(),
	}),
);
export const ApplyCreditToAccountBalanceResultSchema = z.object({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceResponseSchema,
	error: z.string().optional(),
});
