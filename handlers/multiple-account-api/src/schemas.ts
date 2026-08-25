import { z } from 'zod';

export const invitationPathSchema = z.object({
	invitationCode: z.string(),
});

export const subscriptionPathSchema = z.object({
	subscriptionName: z.string(),
});

export const identityIdPathSchema = z.object({
	identityId: z.string(),
});
