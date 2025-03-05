import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { queryResponseSchema } from '@modules/zuora/zuoraSchemas';

export const doQuery = async <T>(
	zuoraClient: ZuoraClient,
	query: string,
): Promise<T> => {
	console.log('Querying zuora...');
	console.log('Query:', query);

	const result = await zuoraClient.post(
		'/v1/action/query',
		JSON.stringify({
			queryString: query,
		}),
		queryResponseSchema,
	);

	return result as T;
};
