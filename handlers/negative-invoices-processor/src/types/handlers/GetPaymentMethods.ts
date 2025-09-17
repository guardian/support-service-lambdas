import { z } from 'zod';
import {
	CheckForActiveSubOutput,
	CheckForActiveSubOutputSchema,
} from './CheckForActiveSub';
import { PaymentMethodResultSchema } from '../shared';

export const GetPaymentMethodsInputSchema = CheckForActiveSubOutputSchema;
export type GetPaymentMethodsInput = CheckForActiveSubOutput;

export const GetPaymentMethodsOutputSchema =
	GetPaymentMethodsInputSchema.extend({
		activePaymentMethodResult: PaymentMethodResultSchema,
	});
export type GetPaymentMethodsOutput = z.infer<
	typeof GetPaymentMethodsOutputSchema
>;
