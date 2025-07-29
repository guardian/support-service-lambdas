import type { ZuoraClient } from './zuoraClient';
import {
	zuoraAccountSchema,
	ZuoraSuccessResponse,
	zuoraSuccessResponseSchema,
} from './zuoraSchemas';
import type { ZuoraAccount } from './zuoraSchemas';

export const getAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<ZuoraAccount> => {
	const path = `v1/accounts/${accountNumber}`;
	return zuoraClient.get(path, zuoraAccountSchema);
};

export const deleteAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<ZuoraSuccessResponse> => {
	const path = `/v1/accounts/${accountNumber}`;
	return zuoraClient.delete(path, zuoraSuccessResponseSchema);
};
