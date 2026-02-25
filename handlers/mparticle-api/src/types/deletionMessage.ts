import { z } from 'zod';

/**
 * Schema for SNS notification envelope
 */
export const SnsNotificationSchema = z.object({
	Type: z.literal('Notification'),
	Message: z.string(), // JSON string containing the actual deletion request
});

/**
 * Schema for SNS subscription confirmation message.
 * Sent by SNS when a new subscription is created — must be confirmed by visiting SubscribeURL.
 */
export const SnsSubscriptionConfirmationSchema = z.object({
	Type: z.literal('SubscriptionConfirmation'),
	SubscribeURL: z.string(),
	TopicArn: z.string(),
	Token: z.string().optional(),
});

/**
 * Discriminated union covering all SNS message types this lambda handles.
 */
export const SnsMessageSchema = z.discriminatedUnion('Type', [
	SnsNotificationSchema,
	SnsSubscriptionConfirmationSchema,
]);

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
