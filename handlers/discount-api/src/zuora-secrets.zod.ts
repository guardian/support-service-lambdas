import { z } from 'zod';

export type ZuoraSecrets = z.infer<typeof zuoraSecretsSchema>;
export const zuoraSecretsSchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
});
