import { z } from 'zod';

export const successOrFailureSchema = z.object({
	Success: z.boolean().optional(),
});
