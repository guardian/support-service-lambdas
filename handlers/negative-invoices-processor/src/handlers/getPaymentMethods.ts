import { stageFromEnvironment } from '@modules/stage';
import { getPaymentMethods } from '@modules/zuora/getPaymentMethodsForAccountId';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraPaymentMethodQueryResponse } from '@modules/zuora/zuoraSchemas';
import { z } from 'zod';

export const GetPaymentMethodsInputSchema = z.object({
	invoiceId: z.string(),
	accountId: z.string(),
	invoiceNumber: z.string(),
	invoiceBalance: z.number(),
	hasActiveSub: z.boolean(),
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

		const activePaymentMethods = getActivePaymentMethods(paymentMethods);

		return {
			...parsedEvent,
			activePaymentMethods,
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

export const getActivePaymentMethods = (
	paymentMethods: ZuoraPaymentMethodQueryResponse,
): Array<{ type: string; status: string; isDefault: boolean }> => {
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

	const activeMethods: Array<{
		type: string;
		status: string;
		isDefault: boolean;
	}> = [];

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
