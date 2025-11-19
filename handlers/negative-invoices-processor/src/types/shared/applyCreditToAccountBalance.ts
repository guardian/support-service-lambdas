import { zuoraUpperCaseSuccessSchema } from '@modules/zuora/types';
import { z } from 'zod';

export const ApplyCreditToAccountBalanceResponseSchema =
	zuoraUpperCaseSuccessSchema.extend({
		Id: z.string().optional(),
	});

export const ApplyCreditToAccountBalanceResultSchema = z.object({
	applyCreditToAccountBalanceAttempt: ApplyCreditToAccountBalanceResponseSchema,
	error: z.string().optional(),
});
