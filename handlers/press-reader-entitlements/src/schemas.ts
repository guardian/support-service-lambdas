import { z } from 'zod';

const ok = z.literal('ok');
const error = z.literal('error');

const successfulGetIdentityIdResponse = z.object({
	status: ok,
	id: z.string(),
});

const failedGetIdentityIdResponse = z.object({
	status: error,
	errors: z.array(z.object({ message: z.string(), description: z.string() })),
});

export const getIdentityIdSchema = z.discriminatedUnion('status', [
	successfulGetIdentityIdResponse,
	failedGetIdentityIdResponse,
]);

export type GetIdentityIdResponse = z.infer<typeof getIdentityIdSchema>;
