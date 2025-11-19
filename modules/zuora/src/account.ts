import type { ZuoraAccount } from './types';
import { zuoraAccountSchema, zuoraLowerCaseSuccessSchema } from './types';
import type { ZuoraClient } from './zuoraClient';

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
): Promise<void> => {
	const path = `/v1/accounts/${accountNumber}`;
	await zuoraClient.delete(path, zuoraLowerCaseSuccessSchema);
};

export const updateAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	payload: {
		crmId?: string;
		sfContactId__c?: string;
	},
): Promise<void> => {
	const path = `/v1/accounts/${accountNumber}`;
	const body = JSON.stringify(payload);
	await zuoraClient.put(path, body, zuoraLowerCaseSuccessSchema);
};
