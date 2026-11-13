import { z } from 'zod';

export type IdentityId = string & { readonly __brand: 'IdentityId' };

export const identityIdSchema = z
	.string()
	.regex(/^[0-9]+$/, 'Identity IDs must contain only digits')
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- parsing validates the branded value
	.transform((value) => value as IdentityId);

export const identityDeletionEventSchema = z.object({
	userId: identityIdSchema,
	eventType: z.literal('DELETE'),
});

export const identityDeletionSnsEnvelopeSchema = z.object({
	Type: z.literal('Notification'),
	Message: z.string().min(1),
});
