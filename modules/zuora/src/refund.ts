import { z } from 'zod';
import { zuoraResponseSchema } from './types';
import type { ZuoraClient } from './zuoraClient';

export const doRefund = async <
	T extends z.ZodType = typeof zuoraResponseSchema,
>(
	zuoraClient: ZuoraClient,
	body: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const path = `/v1/object/refund`;
	const finalSchema = (schema ?? zuoraResponseSchema) as T;
	return zuoraClient.post(path, body, finalSchema);
};
