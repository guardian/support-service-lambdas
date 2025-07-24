import z from 'zod';
import type { ZuoraClient } from './zuoraClient';
import type { ZuoraUpperCaseSuccessResponse } from './zuoraSchemas';

export const applyCreditToAccountBalance = async (
	zuoraClient: ZuoraClient,
	body: string,
	schema: z.ZodType<any, z.ZodTypeDef, any>,
): Promise<ZuoraUpperCaseSuccessResponse> => {
	const path = `/v1/object/credit-balance-adjustment`;
	return zuoraClient.post(path, body, schema);
};
