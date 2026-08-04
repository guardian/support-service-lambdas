import type { z } from 'zod';
import { DefaultPaymentMethodResponseSchema } from './types';
import { voidSchema } from './types/httpResponse';
import type { ZuoraClient } from './zuoraClient';

export async function getPaymentMethods(
	zuoraClient: ZuoraClient,
	accountId: string,
): Promise<z.infer<typeof DefaultPaymentMethodResponseSchema>>;
export async function getPaymentMethods<T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	accountId: string,
	schema: T,
): Promise<z.infer<T>>;
export async function getPaymentMethods<T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	accountId: string,
	schema?: T,
): Promise<z.infer<typeof DefaultPaymentMethodResponseSchema> | z.infer<T>> {
	const path = `/v1/accounts/${accountId}/payment-methods`;
	if (schema === undefined) {
		return zuoraClient.get(path, DefaultPaymentMethodResponseSchema);
	}
	return zuoraClient.get(path, schema);
}

/**
 * Strips the card data from a payment method.
 *
 * Verified against CODE: this succeeds on a default payment method and on a
 * payment method belonging to a cancelled account, neither of which can be
 * deleted. Payment records survive and keep pointing at the payment method id,
 * so the audit trail of which payment used which method is preserved.
 *
 * Scrubbing the default also tidies up the account by itself. Zuora clears
 * defaultPaymentMethodId and, if autoPay was on, turns it off, so the caller
 * never has to write to the account to avoid leaving it with auto pay enabled
 * and nothing to charge.
 *
 * Scrubbing is not repeatable. Once done, the payment method stops being
 * returned by the API at all, and a second attempt fails with 50000020.
 */
export const scrubPaymentMethod = async (
	zuoraClient: ZuoraClient,
	paymentMethodId: string,
): Promise<void> => {
	await zuoraClient.put(
		`/v1/payment-methods/${paymentMethodId}/scrub`,
		JSON.stringify({}),
		voidSchema,
	);
};
