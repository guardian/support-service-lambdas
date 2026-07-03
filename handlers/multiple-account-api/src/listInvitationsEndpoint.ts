import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { InvitationRepository } from './invitationRepository';

export const listInvitationsPathSchema = z.object({
	subscriptionName: z.string(),
});

export type ListInvitationsPath = z.infer<typeof listInvitationsPathSchema>;

export const listInvitationsEndpoint =
	(invitationRepository: InvitationRepository) =>
	async ({ subscriptionName }: ListInvitationsPath) => {
		try {
			logger.mutableAddContext(subscriptionName);
			const invitations = await invitationRepository.list(subscriptionName);
			return ok({ invitations });
		} catch (error) {
			return buildErrorResponse(error);
		}
	};
