import type { z } from 'zod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export const doQuery = async <T>(
	zuoraClient: ZuoraClient,
	query: string,
	queryResponseSchema: z.Schema<T>,
): Promise<T> => {
	console.log('Querying Zuora:', query);

	const body = JSON.stringify({
		queryString: query,
	});

	return await zuoraClient.post('/v1/action/query', body, queryResponseSchema);
};
