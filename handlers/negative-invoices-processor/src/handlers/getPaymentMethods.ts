import { stageFromEnvironment } from '@modules/stage';
import { getPaymentMethods } from '@modules/zuora/paymentMethod';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { GetPaymentMethodsInputSchema } from '../types';
import type {
	GetPaymentMethodsInput,
	GetPaymentMethodsOutput,
	PaymentMethod,
} from '../types';
import { PaymentMethodResponseSchema } from '../types/shared';
import type { PaymentMethodResponse } from '../types/shared/paymentMethod';

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
		console.log('paymentMethods:', JSON.stringify(paymentMethods, null, 2));
		const parsedPaymentMethods =
			PaymentMethodResponseSchema.parse(paymentMethods);
		console.log(
			'parsedPaymentMethods:',
			JSON.stringify(parsedPaymentMethods, null, 2),
		);

		const activePaymentMethods =
			filterActivePaymentMethods(parsedPaymentMethods);

		const hasActivePaymentMethod = activePaymentMethods.length > 0;

		return {
			...parsedEvent,
			activePaymentMethodResult: {
				checkForActivePaymentMethodAttempt: {
					Success: parsedPaymentMethods.success,
				},
				hasActivePaymentMethod,
				activePaymentMethods,
			},
		};
	} catch (error) {
		return {
			...event,
			activePaymentMethodResult: {
				checkForActivePaymentMethodAttempt: {
					Success: false,
				},
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

const filterActivePaymentMethods = (
	paymentMethods: PaymentMethodResponse,
): PaymentMethod[] => {
	const { creditcard, creditcardreferencetransaction, banktransfer, paypal } =
		paymentMethods;

	const flattenedPaymentMethods = [
		...(creditcard ?? []),
		...(creditcardreferencetransaction ?? []),
		...(banktransfer ?? []),
		...(paypal ?? []),
	];
	return flattenedPaymentMethods.filter(
		(pm) => pm.status.toLowerCase() === 'active',
	);
};
