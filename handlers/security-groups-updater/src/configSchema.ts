import { z } from 'zod';

/**
 * Security group ids are stored as a single comma-separated SSM value so
 * they can be updated by ops without a code deploy.
 */
export const ConfigSchema = z.object({
	securityGroupIds: z
		.string()
		.transform((value) =>
			value
				.split(',')
				.map((id) => id.trim())
				.filter((id) => id.length > 0),
		)
		.pipe(z.array(z.string()).min(1)),
});
export type ConfigSchema = z.infer<typeof ConfigSchema>;
