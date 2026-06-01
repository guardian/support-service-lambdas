import { z } from 'zod';

export const argsSchema = z.object({
	stage: z.enum(['CODE', 'PROD']),
	csv: z.string().min(1),
	rps: z.number().int().min(1).max(20).default(5),
	dryRunOnly: z.boolean().default(false),
	limit: z.number().int().min(1).optional(),
});
