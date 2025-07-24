// import { zuoraResponseSchema } from './types/zuoraClient';
import z from 'zod';
import type { ZuoraResponse } from './types/httpResponse';
import type { ZuoraClient } from './zuoraClient';

export const doRefund = async (
	zuoraClient: ZuoraClient,
	body: string,
	schema: z.ZodType<any, z.ZodTypeDef, any>,
): Promise<ZuoraResponse> => {
	//might also want to make return type generic
	const path = `/v1/object/refund`;
	return zuoraClient.post(path, body, schema);
};
