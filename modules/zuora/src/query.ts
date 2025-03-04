import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { QueryResponse } from '@modules/zuora/zuoraSchemas';
import { queryResponseSchema } from '@modules/zuora/zuoraSchemas';

export const doQuery = async (
	zuoraClient: ZuoraClient,
	query: string,
): Promise<QueryResponse> => {
	console.log('Querying zuora...');
	console.log('Query:', query);

	const result = await zuoraClient.post(
		'/v1/action/query',
		JSON.stringify({
			queryString: query,
		}),
		queryResponseSchema,
	);

	return result as QueryResponse;
};
