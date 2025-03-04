import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { QueryResponse } from '@modules/zuora/zuoraSchemas';
import { queryResponseSchema } from '@modules/zuora/zuoraSchemas';

export const doQuery = async (
	zuoraClient: ZuoraClient,
	query: string,
): Promise<QueryResponse> => {
	console.log(`Querying zuora for invoice items...`);
	const result = await zuoraClient.post(
		'/v1/action/query',
		JSON.stringify({
			queryString: query,
		}),
		queryResponseSchema,
	);
	console.log('Query result:', result);
	return result as QueryResponse;
	// if (!result.Success) {
	// 	throw new Error('An error occurred while creating the payment');
	// }
};
