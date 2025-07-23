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

		const parsedPaymentMethods =
			PaymentMethodResponseSchema.parse(paymentMethods);

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
	type PaymentMethodKey =
		| 'creditcard'
		| 'creditcardreferencetransaction'
		| 'banktransfer'
		| 'paypal';

	const keysToCheck = [
		'creditcard',
		'creditcardreferencetransaction',
		'banktransfer',
		'paypal',
	] as const satisfies readonly PaymentMethodKey[];

	const activeMethods: PaymentMethod[] = [];

	for (const key of keysToCheck) {
		const methods = paymentMethods[key];
		if (Array.isArray(methods)) {
			activeMethods.push(
				...methods.filter((pm) => pm.status.toLowerCase() === 'active'),
			);
		}
	}

	return activeMethods;
};
