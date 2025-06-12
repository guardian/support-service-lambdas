import { stageFromEnvironment } from '@modules/stage';
import { getPaymentMethods } from '@modules/zuora/getPaymentMethodsForAccountId';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraPaymentMethodQueryResponse } from '@modules/zuora/zuoraSchemas';
import type { z } from 'zod';
import type { BigQueryRecordSchema } from '../types';

export type CheckForActivePaymentMethodInput = z.infer<
	typeof BigQueryRecordSchema
>;

export const handler = async (event: {
	account_id: string;
	hasActiveSub: boolean;
}) => {
	try {
		// const parsedEvent = BigQueryRecordSchema.parse(event);
		console.log('event:', event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const paymentMethods = await getPaymentMethods(
			zuoraClient,
			event.account_id,
		);

		const accountHasActivePaymentMethod =
			hasActivePaymentMethod(paymentMethods);

		console.log(
			'accountHasActivePaymentMethod:',
			accountHasActivePaymentMethod,
		);
		return {
			account_id: event.account_id,
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
