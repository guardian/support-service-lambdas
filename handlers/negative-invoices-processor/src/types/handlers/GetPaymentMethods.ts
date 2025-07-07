import { z } from 'zod';
import {
	PaymentMethodSchema,
	CheckForActivePaymentMethodAttemptSchema,
} from '../shared';
import {
	CheckForActiveSubOutput,
	CheckForActiveSubOutputSchema,
} from './CheckForActiveSub';

export const GetPaymentMethodsInputSchema = CheckForActiveSubOutputSchema;
export type GetPaymentMethodsInput = CheckForActiveSubOutput;

// Re-export PaymentMethodSchema for compatibility
export { PaymentMethodSchema };

export const GetPaymentMethodsOutputSchema =
	GetPaymentMethodsInputSchema.extend({
		checkForActivePaymentMethodAttempt:
			CheckForActivePaymentMethodAttemptSchema,
	});
export type GetPaymentMethodsOutput = z.infer<
	typeof GetPaymentMethodsOutputSchema
>;
