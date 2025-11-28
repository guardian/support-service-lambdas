import type { z } from 'zod';
import { zuoraUpperCaseSuccessSchema } from './types';
import type { ZuoraClient } from './zuoraClient';

export const applyCreditToAccountBalance = async <
	T extends z.ZodType = typeof zuoraUpperCaseSuccessSchema,
>(
	zuoraClient: ZuoraClient,
	body: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const path = `/v1/object/credit-balance-adjustment`;
	const finalSchema = schema ?? zuoraUpperCaseSuccessSchema;
	return zuoraClient.post(path, body, finalSchema);
};
