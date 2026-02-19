import { z } from 'zod';

/**
 * Schema for SNS notification envelope
 */
export const SnsNotificationSchema = z.object({
	Type: z.literal('Notification'),
	Message: z.string(), // JSON string containing the actual deletion request
});

/**
 * Schema for the deletion request message body that comes from the Identity service
 */
export const DeletionRequestBodySchema = z.object({
	userId: z.string(),
	eventType: z.string().optional(),
	email: z.string().optional(),
	brazeId: z.string().optional(),
});

export type DeletionRequestBody = z.infer<typeof DeletionRequestBodySchema>;

/**
 * Result of attempting to delete a user from a service
 */
export type DeletionResult =
	| { success: true }
	| { success: false; error: Error; retryable: boolean };
