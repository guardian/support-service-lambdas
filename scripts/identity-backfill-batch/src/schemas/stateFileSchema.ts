import { z } from 'zod';

export const stateFileSchema = z.object({
	processed: z.array(z.string()).optional(),
	rejected: z.array(z.string()).optional(),
	errored: z.array(z.string()).optional(),
});
