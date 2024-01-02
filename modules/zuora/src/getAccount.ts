import type { ZuoraClient } from './zuoraClient';
import type { ZuoraAccount } from './zuoraSchemas';
import { zuoraAccountSchema } from './zuoraSchemas';

export const getAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<ZuoraAccount> => {
	const path = `v1/accounts/${accountNumber}`;
	return zuoraClient.get(path, zuoraAccountSchema);
};
