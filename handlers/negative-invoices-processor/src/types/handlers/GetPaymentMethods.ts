import { z } from 'zod';
import {
	CheckForActiveSubOutput,
	CheckForActiveSubOutputSchema,
} from './CheckForActiveSub';
import { CheckForActivePaymentMethodAttemptSchema } from '../shared/paymentMethod';

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
