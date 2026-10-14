import { z } from 'zod';

export const ConfigSchema = z.object({
	'identity-client-access-token': z.string(),
});
export type AppConfig = z.infer<typeof ConfigSchema>;
