import * as z from 'zod';
import type { ZuoraClient } from './zuoraClient';

const responseSchema = z.object({
	records: z.array(z.object({ AccountNumber: z.string() })),
});

type Response = z.infer<typeof responseSchema>;

export const getActiveAccountNumbersForIdentityId = async (
	zuoraClient: ZuoraClient,
	identityId: string,
) => {
	const path = `/v1/action/query`;

	const body = {
		queryString: `select accountNumber from account where status = 'Active' and IdentityId__c = '${identityId}'`,
	};
	const response: Response = await zuoraClient.post(
		path,
		JSON.stringify(body),
		responseSchema,
	);

	return response.records.map((record) => record.AccountNumber);
};
