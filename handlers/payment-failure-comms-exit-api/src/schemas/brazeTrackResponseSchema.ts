import { z } from 'zod';

export const brazeTrackResponseSchema = z.object({
	message: z.literal('success'),
	errors: z.array(z.string()).optional(),
});
