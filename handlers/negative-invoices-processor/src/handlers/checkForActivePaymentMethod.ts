import { stageFromEnvironment } from '@modules/stage';
import { getPaymentMethods } from '@modules/zuora/getPaymentMethodsForAccountId';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraPaymentMethodQueryResponse } from '@modules/zuora/zuoraSchemas';
import { z } from 'zod';

export const CheckForActivePaymentMethodInputSchema = z.object({
	accountId: z.string(),
	hasActiveSub: z.boolean(),
});

export type CheckForActivePaymentMethodInput = z.infer<
	typeof CheckForActivePaymentMethodInputSchema
>;

export const handler = async (event: CheckForActivePaymentMethodInput) => {
	try {
		const parsedEvent = CheckForActivePaymentMethodInputSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const paymentMethods = await getPaymentMethods(
			zuoraClient,
			parsedEvent.accountId,
		);

		const accountHasActivePaymentMethod =
			hasActivePaymentMethod(paymentMethods);

		return {
			...parsedEvent,
			hasActivePaymentMethod: accountHasActivePaymentMethod,
		};
	} catch (error) {
		return {
			...event,
			checkPaymentMethodStatus: 'Error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};

export const hasActivePaymentMethod = (
	paymentMethods: ZuoraPaymentMethodQueryResponse,
): boolean => {
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

	for (const key of keysToCheck) {
		const arr = paymentMethods[key];
		if (arr && activeStatusPresent(arr)) {
			return true;
		}
	}
	return false;
};

function activeStatusPresent(arr: Array<{ status: string }>): boolean {
	return arr.some((pm) => pm.status.toLowerCase() === 'active');
}
