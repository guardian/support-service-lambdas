import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';

const successResponseSchema = z.object({
	Id: z.string(),
	Success: z.literal(true),
});

const errorResponseSchema = z.object({
	Errors: z.array(
		z.object({
			Message: z.string(),
			Code: z.string(),
		}),
	),
	Success: z.literal(false),
});

const responseSchema = z.union([successResponseSchema, errorResponseSchema]);

export const actionUpdate = async (zuoraClient: ZuoraClient, body: string) => {
	const path = 'v1/action/update';

	return zuoraClient.post(path, body, responseSchema);
};
