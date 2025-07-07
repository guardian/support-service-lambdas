import { z } from 'zod';
import { CheckForActiveSubAttemptSchema } from '../shared';
import {
	ApplyCreditToAccountBalanceOutput,
	ApplyCreditToAccountBalanceOutputSchema,
} from './ApplyCreditToAccountBalance';

export const CheckForActiveSubInputSchema =
	ApplyCreditToAccountBalanceOutputSchema;
export type CheckForActiveSubInput = ApplyCreditToAccountBalanceOutput;

export const CheckForActiveSubOutputSchema =
	CheckForActiveSubInputSchema.extend({
		checkForActiveSubAttempt: CheckForActiveSubAttemptSchema,
	});

export type CheckForActiveSubOutput = z.infer<
	typeof CheckForActiveSubOutputSchema
>;
