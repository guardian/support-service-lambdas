import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';

const successObjectSchema = z.object({
	Id: z.string(),
	Success: z.literal(true),
});

const errorObjectSchema = z.object({
	Errors: z.array(
		z.object({
			Message: z.string(),
			Code: z.string(),
		}),
	),
	Success: z.literal(false),
});

const responseSchema = z.array(
	z.union([successObjectSchema, errorObjectSchema]),
);

export type ActionUpdateResponse = z.infer<typeof responseSchema>;

export const actionUpdate = async (
	zuoraClient: ZuoraClient,
	body: string,
): Promise<ActionUpdateResponse> => {
	const path = 'v1/action/update';

	return zuoraClient.post(path, body, responseSchema);
};
