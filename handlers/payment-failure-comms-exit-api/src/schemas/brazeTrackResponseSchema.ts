import { z } from 'zod';

export const brazeTrackResponseSchema = z
	.object({
		message: z.string().optional(),
		errors: z.array(z.string()).optional(),
	})
	.passthrough();
