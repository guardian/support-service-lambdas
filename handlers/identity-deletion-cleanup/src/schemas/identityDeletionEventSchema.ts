import { z } from 'zod';

export const identityDeletionEventSchema = z.object({
	userId: z.string().min(1),
	eventType: z.literal('DELETE'),
	brazeId: z.string().nullable().optional(),
});

export const identityDeletionSnsEnvelopeSchema = z.discriminatedUnion('Type', [
	z.object({
		Type: z.literal('Notification'),
		Message: z.string().min(1),
	}),
	z.object({
		Type: z.literal('SubscriptionConfirmation'),
	}),
]);
