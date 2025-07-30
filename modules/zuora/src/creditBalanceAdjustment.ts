import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';
import { zuoraResponseSchema } from './types';

export const applyCreditToAccountBalance = async <
	T extends z.ZodType = typeof zuoraResponseSchema,
>(
	zuoraClient: ZuoraClient,
	body: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const path = `/v1/object/credit-balance-adjustment`;
	const finalSchema = (schema ?? zuoraResponseSchema) as T;
	return zuoraClient.post(path, body, finalSchema);
};
