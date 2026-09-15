import { z } from 'zod';

export const identityDeletionEventSchema = z.object({
	userId: z.string().regex(/^[0-9]+$/),
	eventType: z.literal('DELETE'),
	brazeId: z.string().nullable().optional(),
});

export const identityDeletionSnsEnvelopeSchema = z.object({
	Type: z.literal('Notification'),
	Message: z.string().min(1),
});
