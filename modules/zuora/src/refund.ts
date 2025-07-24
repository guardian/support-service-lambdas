import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';
import { zuoraResponseSchema } from './types/httpResponse';

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
