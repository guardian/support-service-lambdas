import { z } from 'zod';
import { CheckForActivePaymentMethodAttemptSchema } from '../shared';
import {
	CheckForActiveSubOutput,
	CheckForActiveSubOutputSchema,
} from './CheckForActiveSub';

export const GetPaymentMethodsInputSchema = CheckForActiveSubOutputSchema;
export type GetPaymentMethodsInput = CheckForActiveSubOutput;

export const GetPaymentMethodsOutputSchema =
	GetPaymentMethodsInputSchema.extend({
		checkForActivePaymentMethodAttempt:
			CheckForActivePaymentMethodAttemptSchema,
	});
export type GetPaymentMethodsOutput = z.infer<
	typeof GetPaymentMethodsOutputSchema
>;
