import type { z } from 'zod';
import { ActiveSubscriptionResultSchema } from '../shared';
import type { ApplyCreditToAccountBalanceOutput } from './ApplyCreditToAccountBalance';
import { ApplyCreditToAccountBalanceOutputSchema } from './ApplyCreditToAccountBalance';

export const CheckForActiveSubInputSchema =
	ApplyCreditToAccountBalanceOutputSchema;
export type CheckForActiveSubInput = ApplyCreditToAccountBalanceOutput;

export const CheckForActiveSubOutputSchema =
	CheckForActiveSubInputSchema.extend({
		activeSubResult: ActiveSubscriptionResultSchema,
	});
export type CheckForActiveSubOutput = z.infer<
	typeof CheckForActiveSubOutputSchema
>;
