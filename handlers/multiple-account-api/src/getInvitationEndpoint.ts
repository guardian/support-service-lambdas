import type { APIGatewayProxyResult } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import {
	badRequest,
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
	invitationCode: string,
): Promise<APIGatewayProxyResult> => {
	logger.mutableAddContext(invitationCode);

	try {
		const invitation = await invitationRepository.get(invitationCode);

		if (!invitation) {
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
