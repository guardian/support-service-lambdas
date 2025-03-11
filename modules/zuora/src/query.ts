import type { z } from 'zod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export const doQuery = async <T>(
	zuoraClient: ZuoraClient,
	query: string,
	queryResponseSchema: z.Schema<T>,
): Promise<T> => {
	try {
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

		if (!parsedResult.done) {
			throw new Error(
				'Query did not complete successfully. Result: ' +
					JSON.stringify(result),
			);
		}
		return result as T;
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : JSON.stringify(error, null, 2);

		throw new Error(errorMessage);
	}
};
