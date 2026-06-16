import type { z, ZodTypeDef } from 'zod';
import { DefaultPaymentMethodResponseSchema } from './types';
import type { ZuoraClient } from './zuoraClient';

export async function getPaymentMethods(
	zuoraClient: ZuoraClient,
	accountId: string,
): Promise<z.infer<typeof DefaultPaymentMethodResponseSchema>>;
export async function getPaymentMethods<
	T extends z.ZodType<unknown, ZodTypeDef, unknown>,
>(zuoraClient: ZuoraClient, accountId: string, schema: T): Promise<z.infer<T>>;
export async function getPaymentMethods<
	T extends z.ZodType<unknown, ZodTypeDef, unknown>,
>(
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
