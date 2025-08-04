import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';
import type { ZuoraResponse } from '../../../modules/zuora/src/types/httpResponse';
import { zuoraSuccessSchema } from '../../../modules/zuora/src/types/httpResponse';
import type { ZuoraAccount } from './types/objects/account';
import { zuoraAccountSchema } from './types/objects/account';

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
): Promise<ZuoraResponse> => {
	const path = `/v1/accounts/${accountNumber}`;
	return zuoraClient.delete(path, zuoraSuccessSchema);
};

const responseSchema = z.object({
	success: z.boolean(),
	reasons: z.optional(
		z.array(z.object({ code: z.number(), message: z.string() })),
	),
});

export type UpdateAccountResponse = z.infer<typeof responseSchema>;

export const updateAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	payload: {
		crmId?: string;
		sfContactId__c?: string;
	},
): Promise<UpdateAccountResponse> => {
	const path = `/v1/accounts/${accountNumber}`;
	const body = JSON.stringify(payload);
	return zuoraClient.put(path, body, responseSchema);
};
