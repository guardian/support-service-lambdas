import z from 'zod';
import type { ZuoraClient } from './zuoraClient';
import { DefaultPaymentMethodResponse } from './types/paymentMethod';

export const getPaymentMethods = async <T = DefaultPaymentMethodResponse>(
	zuoraClient: ZuoraClient,
	accountId: string,
	schema: z.ZodType<any, z.ZodTypeDef, any>,
): Promise<T> => {
	const path = `/v1/accounts/${accountId}/payment-methods`;
	return zuoraClient.get(path, schema);
};
