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
import type { InvitationRecord } from './invitationRepository';
import {
	activeInvitationRecordSchema,
	type InvitationRepository,
} from './invitationRepository';

const invitationAlreadyAccepted = async (
	invitation: InvitationRecord | undefined,
	secondaryUserRepository: SecondaryUserRepository,
	invitationCode: string,
) => {
	// Invitations are soft-accepted, so they may still exist with an acceptedDate set.
	if (invitation?.acceptedDate) {
		return true;
	}

	if (invitation) {
		return false;
	}

	// Otherwise if the invitation is missing but a secondary user record exists for this
	// invitation code, then it has already been accepted. This happens once a
	// soft-accepted invitation's retention period (used to allow time for export
	// to the data platform) has expired and the record has been removed by
	// DynamoDB's TTL.

	// We can't check the signed in user here since this endpoint is not authenticated,
	// so we look up the secondary user record by invitation code instead.
	const alreadyAccepted =
		(await secondaryUserRepository.listByInvitationCode(invitationCode))
			.length > 0;
	return alreadyAccepted;
};

export const getInvitationEndpoint = async (
	invitationRepository: InvitationRepository,
	secondaryUserRepository: SecondaryUserRepository,
	invitationCode: string,
): Promise<APIGatewayProxyResult> => {
	logger.mutableAddContext(invitationCode);

	try {
		const invitation = await invitationRepository.get(invitationCode);

		if (
			await invitationAlreadyAccepted(
				invitation,
				secondaryUserRepository,
				invitationCode,
			)
		) {
			return gone('Invitation has already been accepted');
		}

		if (!invitation) {
			return notFound();
		}

		if (invitation.cancelledBy !== undefined) {
			return badRequest(
				`The invitation has been cancelled by the ${invitation.cancelledBy} user`,
			);
		}

		return ok(invitation, activeInvitationRecordSchema);
	} catch (error) {
		logger.error('Error retrieving invitation', error);
		return internalServerError();
	}
};
