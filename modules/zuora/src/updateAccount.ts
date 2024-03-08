import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';

const responseSchema = z.object({
	success: z.boolean(),
	reasons: z.optional(
		z.array(z.object({ code: z.string(), message: z.string() })),
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
