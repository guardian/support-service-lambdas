import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { z } from 'zod';

export const executeZoqlQuery = async <
	I,
	O,
	T extends z.ZodType<O, z.ZodTypeDef, I>,
>(
	query: string,
	zuoraClient: ZuoraClient,
	responseSchema: T,
): Promise<O> => {
	const response: z.infer<typeof responseSchema> = await zuoraClient.post(
		'/v1/action/query',
		JSON.stringify({
			queryString: query,
		}),
		responseSchema,
	);
	return response;
};
