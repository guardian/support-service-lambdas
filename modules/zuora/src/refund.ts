import { z } from 'zod';
import { zuoraSuccessSchema } from './types';
import type { ZuoraClient } from './zuoraClient';

export const doRefund = async <T extends z.ZodType = typeof zuoraSuccessSchema>(
	zuoraClient: ZuoraClient,
	body: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const path = `/v1/object/refund1`;
	const finalSchema = (schema ?? zuoraSuccessSchema) as T;
	return zuoraClient.post(path, body, finalSchema);
};
