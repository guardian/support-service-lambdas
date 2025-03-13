import type { z } from 'zod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export const doQuery = async <T>(
	zuoraClient: ZuoraClient,
	query: string,
	queryResponseSchema: z.Schema<T>,
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
