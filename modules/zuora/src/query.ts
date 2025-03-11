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
	const parsedResult = queryResponseSchema.parse(result) as { done: boolean };
	console.log('parsedResult:', parsedResult);
	if (parsedResult.done) {
		console.log('Query is complete.');
	} else {
		console.log('Query is not complete.');
	}
	return result as T;
};
