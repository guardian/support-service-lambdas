import type { ZuoraClient } from './zuoraClient';
import type { ZuoraSuccessResponse } from './zuoraSchemas';
import { zuoraSuccessResponseSchema } from './zuoraSchemas';

export const deleteAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<ZuoraSuccessResponse> => {
	const path = `/v1/accounts/${accountNumber}`;
	return zuoraClient.delete(path, zuoraSuccessResponseSchema);
};
