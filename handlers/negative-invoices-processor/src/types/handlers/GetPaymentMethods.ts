import type { z } from 'zod';
import { PaymentMethodResultSchema } from '../shared';
import type { CheckForActiveSubOutput } from './CheckForActiveSub';
import { CheckForActiveSubOutputSchema } from './CheckForActiveSub';

export const GetPaymentMethodsInputSchema = CheckForActiveSubOutputSchema;
export type GetPaymentMethodsInput = CheckForActiveSubOutput;

export const GetPaymentMethodsOutputSchema =
	GetPaymentMethodsInputSchema.extend({
		activePaymentMethodResult: PaymentMethodResultSchema,
	});
export type GetPaymentMethodsOutput = z.infer<
	typeof GetPaymentMethodsOutputSchema
>;
