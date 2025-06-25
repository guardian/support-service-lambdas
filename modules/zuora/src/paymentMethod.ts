import type { ZuoraClient } from './zuoraClient';
import type { ZuoraPaymentMethodQueryResponse } from './zuoraSchemas';
import { zuoraPaymentMethodQueryResponseSchema } from './zuoraSchemas';

export const getPaymentMethods = async (
	zuoraClient: ZuoraClient,
	accountId: string,
): Promise<ZuoraPaymentMethodQueryResponse> => {
	const path = `/v1/accounts/${accountId}/payment-methods`;
	return zuoraClient.get(path, zuoraPaymentMethodQueryResponseSchema);
};

export const filterActivePaymentMethods = (
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
