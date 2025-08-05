import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';
import { zuoraSuccessSchema } from './types';

export const applyCreditToAccountBalance = async <T extends z.ZodType>(
	zuoraClient: ZuoraClient,
	body: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const path = `/v1/object/credit-balance-adjustment`;
	const finalSchema = (schema ?? zuoraSuccessSchema) as T;
	return zuoraClient.post(path, body, finalSchema);
};
