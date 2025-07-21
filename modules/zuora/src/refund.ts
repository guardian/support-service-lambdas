// import { zuoraResponseSchema } from './types/zuoraClient';
import z from 'zod';
import type { ZuoraResponse } from './types/zuoraClient';
import type { ZuoraClient } from './zuoraClient';

export const doRefund = async (
	zuoraClient: ZuoraClient,
	body: string,
	schema: z.ZodType<any, z.ZodTypeDef, any>,
): Promise<ZuoraResponse> => {
	const path = `/v1/object/refund`;
	return zuoraClient.post(path, body, schema);
};
