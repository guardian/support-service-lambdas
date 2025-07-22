import z from 'zod';
import type { ZuoraClient } from './zuoraClient';

export const getPaymentMethods = async <T>(
	zuoraClient: ZuoraClient,
	accountId: string,
	schema: z.ZodType<any, z.ZodTypeDef, any>,
): Promise<T> => {
	const path = `/v1/accounts/${accountId}/payment-methods`;
	return zuoraClient.get(path, schema);
};
