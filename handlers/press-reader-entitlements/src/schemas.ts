import { z } from 'zod';

const ok = z.literal('ok');
const error = z.literal('error');

const successfulGetUserDetailsResponse = z.object({
	status: ok,
	id: z.string(),
	primaryEmailAddress: z.string(),
});

const failedGetUserDetailsResponse = z.object({
	status: error,
	errors: z.array(z.object({ message: z.string(), description: z.string() })),
});

export const getUserDetailsSchema = z.discriminatedUnion('status', [
	successfulGetUserDetailsResponse,
	failedGetUserDetailsResponse,
]);

export type GetUserDetailsResponse = z.infer<typeof getUserDetailsSchema>;
