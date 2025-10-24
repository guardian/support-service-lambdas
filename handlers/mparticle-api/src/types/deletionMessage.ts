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
 * Message attributes track which deletion APIs have been called successfully
 * This allows idempotent retry logic when messages are reprocessed from DLQ
 */
export const MessageAttributesSchema = z.object({
	mParticleDeleted: z
		.enum(['true', 'false'])
		.optional()
		.default('false')
		.transform((val) => val === 'true'),
	brazeDeleted: z
		.enum(['true', 'false'])
		.optional()
		.default('false')
		.transform((val) => val === 'true'),
	attemptCount: z
		.string()
		.optional()
		.default('0')
		.transform((val) => parseInt(val, 10)),
});

export type MessageAttributes = z.infer<typeof MessageAttributesSchema>;

/**
 * SQS Message Attributes format (AWS SDK structure)
 */
export interface SQSMessageAttributes {
	[key: string]: {
		dataType: string;
		stringValue?: string;
	};
}

/**
 * Helper to convert SQS message attributes to our typed format
 */
export function parseMessageAttributes(
	sqsAttributes?: SQSMessageAttributes,
): MessageAttributes {
	const rawAttributes = {
		mParticleDeleted: sqsAttributes?.mParticleDeleted?.stringValue || 'false',
		brazeDeleted: sqsAttributes?.brazeDeleted?.stringValue || 'false',
		attemptCount: sqsAttributes?.attemptCount?.stringValue || '0',
	};
	return MessageAttributesSchema.parse(rawAttributes);
}

/**
 * Helper to convert our typed attributes back to SQS format
 */
export function toSQSMessageAttributes(
	attributes: MessageAttributes,
): SQSMessageAttributes {
	return {
		mParticleDeleted: {
			dataType: 'String',
			stringValue: attributes.mParticleDeleted.toString(),
		},
		brazeDeleted: {
			dataType: 'String',
			stringValue: attributes.brazeDeleted.toString(),
		},
		attemptCount: {
			dataType: 'String',
			stringValue: attributes.attemptCount.toString(),
		},
	};
}

/**
 * Result of attempting to delete a user from a service
 */
export type DeletionResult =
	| { success: true }
	| { success: false; error: Error; retryable: boolean };

/**
 * Status of deletions across both services
 */
export interface DeletionStatus {
	mParticleDeleted: boolean;
	brazeDeleted: boolean;
	allSucceeded: boolean;
}
