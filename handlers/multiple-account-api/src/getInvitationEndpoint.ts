import type { APIGatewayProxyResult } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import {
	badRequest,
	gone,
	internalServerError,
	notFound,
	ok,
} from '@modules/routing/apiGatewayResponses';
import {
	type InvitationRepository,
	nonCancelledInvitationRecordSchema,
} from './invitationRepository';

export const getInvitationEndpoint = async (
	invitationRepository: InvitationRepository,
	secondaryUserRepository: SecondaryUserRepository,
	invitationCode: string,
): Promise<APIGatewayProxyResult> => {
	logger.mutableAddContext(invitationCode);

	try {
		const invitation = await invitationRepository.get(invitationCode);

		if (!invitation) {
			// The invitation is hard-deleted once accepted, so if it's missing but a
			// secondary user record already exists for this invitation code, the
			// invitation has already been accepted. We can't check the signed in
			// user here since this endpoint is not authenticated, so we look up the
			// secondary user record by invitation code instead.
			const alreadyAccepted =
				(await secondaryUserRepository.listByInvitationCode(invitationCode))
					.length > 0;

			if (alreadyAccepted) {
				return gone('Invitation has already been accepted');
			}

			return notFound();
		}

		if (invitation.cancelledBy !== undefined) {
			return badRequest(
				`The invitation has been cancelled by the ${invitation.cancelledBy} user`,
			);
		}

		return ok(invitation, nonCancelledInvitationRecordSchema);
	} catch (error) {
		logger.error('Error retrieving invitation', error);
		return internalServerError();
	}
};
