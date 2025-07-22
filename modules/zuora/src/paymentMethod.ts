import z from 'zod';
import type { ZuoraClient } from './zuoraClient';
import { zuoraResponseSchema } from './types';

//TODO this all needs to be refactored to use the new schemas and types
export const PaymentMethodSchema = z.object({
	id: z.string(),
	status: z.string(),
	type: z.string(),
	isDefault: z.boolean(),
});
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const PaymentMethodResponseSchema = zuoraResponseSchema.extend({
	creditcardreferencetransaction: z.array(PaymentMethodSchema).optional(),
	creditcard: z.array(PaymentMethodSchema).optional(),
	banktransfer: z.array(PaymentMethodSchema).optional(),
	paypal: z.array(PaymentMethodSchema).optional(),
});
export type PaymentMethodResponse = z.infer<typeof PaymentMethodResponseSchema>;

export const getPaymentMethods = async (
	zuoraClient: ZuoraClient,
	accountId: string,
	schema: z.ZodType<any, z.ZodTypeDef, any>,
): Promise<PaymentMethodResponse> => {
	const path = `/v1/accounts/${accountId}/payment-methods`;
	return zuoraClient.get(path, schema);
};

export const filterActivePaymentMethods = (
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
