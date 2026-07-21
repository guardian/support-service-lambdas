import { logger } from '@modules/logger/logger';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { InvitationRepository } from './invitationRepository';

export const listInvitationsEndpoint = async (
	invitationRepository: InvitationRepository,
	subscriptionName: string,
) => {
	try {
		logger.mutableAddContext(subscriptionName);
		const invitations = await invitationRepository.list(subscriptionName);
		return ok({ invitations });
	} catch (error) {
		return buildErrorResponse(error);
	}
};
