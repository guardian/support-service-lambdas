import { stageFromEnvironment } from '@modules/stage';
import {
	filterActivePaymentMethods,
	getPaymentMethods,
} from '@modules/zuora/paymentMethod';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { GetPaymentMethodsInputSchema } from '../types';
import type { GetPaymentMethodsInput, GetPaymentMethodsOutput } from '../types';
import { PaymentMethodResponseSchema } from '../types/shared/paymentMethod';

export const handler = async (
	event: GetPaymentMethodsInput,
): Promise<GetPaymentMethodsOutput> => {
	try {
		const parsedEvent = GetPaymentMethodsInputSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const paymentMethods = await getPaymentMethods(
			zuoraClient,
			parsedEvent.accountId,
			PaymentMethodResponseSchema,
		);
		const activePaymentMethods = filterActivePaymentMethods(paymentMethods);
		const hasActivePaymentMethod = activePaymentMethods.length > 0;
		return {
			...parsedEvent,
			checkForActivePaymentMethodAttempt: {
				Success: paymentMethods.success,
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
