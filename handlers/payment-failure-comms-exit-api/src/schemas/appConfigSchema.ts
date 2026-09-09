import { z } from 'zod';

export const appConfigSchema = z.object({
	braze: z.object({
		apiUrl: z.string().url(),
		apiKey: z.string().min(1),
		appId: z.string().min(1),
	}),
});
