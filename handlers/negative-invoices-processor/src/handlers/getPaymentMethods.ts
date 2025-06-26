import { stageFromEnvironment } from '@modules/stage';
import {
	filterActivePaymentMethods,
	getPaymentMethods,
} from '@modules/zuora/paymentMethod';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';

export const GetPaymentMethodsInputSchema = z.object({
	invoiceId: z.string(),
	accountId: z.string(),
	invoiceNumber: z.string(),
	invoiceBalance: z.number(),
	applyCreditToAccountBalanceAttempt: z.object({
		Success: z.boolean(),
	}),
	checkForActiveSubAttempt: z.object({
		Success: z.boolean(),
		hasActiveSub: z.boolean(),
	}),
});

export type GetPaymentMethodsInput = z.infer<
	typeof GetPaymentMethodsInputSchema
>;

export const handler = async (event: GetPaymentMethodsInput) => {
	try {
		const parsedEvent = GetPaymentMethodsInputSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const paymentMethods = await getPaymentMethods(
			zuoraClient,
			parsedEvent.accountId,
		);

		const activePaymentMethods = filterActivePaymentMethods(paymentMethods);
		const hasActivePaymentMethod = activePaymentMethods.length > 0;
		return {
			...parsedEvent,
			checkForActivePaymentMethodAttempt: {
				Success: true,
				hasActivePaymentMethod,
				activePaymentMethods,
			},
		};
	} catch (error) {
		return {
			...event,
			checkForActivePaymentMethodAttempt: {
				Success: false,
				hasActivePaymentMethod: undefined,
				activePaymentMethods: undefined,
				error:
					error instanceof Error
						? error.message
						: JSON.stringify(error, null, 2),
			},
		};
	}
};
