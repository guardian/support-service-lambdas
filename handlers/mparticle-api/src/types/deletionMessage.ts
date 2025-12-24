import { z } from 'zod';

/**
 * Schema for the deletion request message body that comes from the Identity service
 */
export const DeletionRequestBodySchema = z.object({
	userId: z.string(),
	email: z.string().optional(),
});

export type DeletionRequestBody = z.infer<typeof DeletionRequestBodySchema>;

/**
 * Result of attempting to delete a user from a service
 */
export type DeletionResult =
	| { success: true }
	| { success: false; error: Error; retryable: boolean };
