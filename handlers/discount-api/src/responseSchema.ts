import { z } from 'zod';

export const eligibilityCheckSchema = z.object({
	valid: z.boolean(),
});

export type EligibilityCheckResponseBody = z.infer<
	typeof eligibilityCheckSchema
>;
