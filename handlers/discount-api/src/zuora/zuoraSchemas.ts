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

export const zuoraSubscriptionSchema = z.object({
	id: z.string(),
	accountId: z.string(),
});

export type ZuoraSubscription = z.infer<typeof zuoraSubscriptionSchema>;
