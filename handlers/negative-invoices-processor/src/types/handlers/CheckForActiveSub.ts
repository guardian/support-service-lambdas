import { z } from 'zod';
import {
	ApplyCreditToAccountBalanceOutput,
	ApplyCreditToAccountBalanceOutputSchema,
} from './ApplyCreditToAccountBalance';
import { ActiveSubscriptionResultSchema } from '../shared/subscription';

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
