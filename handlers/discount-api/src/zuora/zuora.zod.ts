import { z } from 'zod';

export type ZuoraCredentials = z.infer<typeof zuoraCredentialsSchema>;
export const zuoraCredentialsSchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
});

export type ZuoraBearerToken = z.infer<typeof zuoraBearerTokenSchema>;

export const zuoraBearerTokenSchema = z.object({
	access_token: z.string(),
	expires_in: z.number(),
});
