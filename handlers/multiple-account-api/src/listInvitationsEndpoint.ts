import { logger } from '@modules/logger/logger';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import { z } from 'zod';
import type { InvitationRepository } from './invitationRepository';

export const listInvitationsBodySchema = z.object({
	subscriptionName: z.string(),
});

export type ListInvitationsBody = z.infer<typeof listInvitationsBodySchema>;

export const listInvitationsEndpoint =
	(invitationRepository: InvitationRepository) =>
	async (body: ListInvitationsBody) => {
		try {
			const { subscriptionName } = body;
			logger.mutableAddContext(subscriptionName);
			const invitations = await invitationRepository.list(subscriptionName);
			return ok({ invitations });
		} catch (error) {
			return buildErrorResponse(error);
		}
	};
