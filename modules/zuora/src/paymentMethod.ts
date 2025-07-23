import z from 'zod';
import { DefaultPaymentMethodResponseSchema } from './types';
import type { ZuoraClient } from './zuoraClient';

export const getPaymentMethods = async <
	T extends z.ZodType = typeof DefaultPaymentMethodResponseSchema,
>(
	zuoraClient: ZuoraClient,
	accountId: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const path = `/v1/accounts/${accountId}/payment-methods`;
	const finalSchema = (schema ?? DefaultPaymentMethodResponseSchema) as T;
	return zuoraClient.get(path, finalSchema);
};
