import { z } from 'zod';

export const SalesforceCreateErrorSchema = z.object({
	statusCode: z.string().optional(),
	message: z.string(),
	fields: z.array(z.string()),
});

export const SalesforceCreateResponseSchema = z.object({
	id: z.string().optional(),
	success: z.boolean(),
	errors: z.array(SalesforceCreateErrorSchema),
});
