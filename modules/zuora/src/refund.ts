import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';
import { createRecordResultSchema } from './types/actions/createRecordResponse';

export const doRefund = async <
	T extends z.ZodType = typeof createRecordResultSchema,
>(
	zuoraClient: ZuoraClient,
	body: string,
	schema?: T,
): Promise<z.infer<T>> => {
	const finalSchema = (schema ?? createRecordResultSchema) as T;
	return zuoraClient.post(`/v1/object/refund`, body, finalSchema);
};
