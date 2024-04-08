import { z } from 'zod';
import type { ZuoraClient } from './zuoraClient';

const responseSchema = z.array(
	z.object({
		Id: z.optional(z.string()),
		Success: z.boolean(),
		Errors: z.optional(
			z.array(
				z.object({
					Message: z.string(),
					Code: z.string(),
				}),
			),
		),
	}),
);

export type ActionUpdateResponse = z.infer<typeof responseSchema>;

export const actionUpdate = async (
	zuoraClient: ZuoraClient,
	body: string,
): Promise<ActionUpdateResponse> => {
	const path = 'v1/action/update';

	return zuoraClient.post(path, body, responseSchema);
};
