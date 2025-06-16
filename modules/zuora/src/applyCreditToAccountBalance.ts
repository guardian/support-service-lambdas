import type { ZuoraClient } from './zuoraClient';
import type { ZuoraSuccessResponse } from './zuoraSchemas';
import { zuoraSuccessResponseSchema } from './zuoraSchemas';

export const applyCreditToAccountBalance = async (
	zuoraClient: ZuoraClient,
	body: string,
): Promise<ZuoraSuccessResponse> => {
	const path = `/v1/object/credit-balance-adjustment`;
	return zuoraClient.post(path, body, zuoraSuccessResponseSchema);
};
