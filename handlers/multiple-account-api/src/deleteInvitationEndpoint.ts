import type { APIGatewayProxyResult } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import {
	badRequest,
	internalServerError,
	notFound,
} from '@modules/routing/apiGatewayResponses';
import { type InvitationRepository } from './invitationRepository';

export const deleteInvitationEndpoint = async (
	invitationRepository: InvitationRepository,
	invitationCode: string,
	identityId: string,
): Promise<APIGatewayProxyResult> => {
	logger.mutableAddContext(invitationCode);

	try {
		const invitation = await invitationRepository.get(invitationCode);

		if (!invitation || invitation.cancelledBy !== undefined) {
			return notFound();
		}

		if (
			identityId != invitation.primaryIdentityId &&
			identityId != invitation.secondaryIdentityId
		) {
			return badRequest(
				'The x-identity-id does not match the primary or secondary user of this invitation',
			);
		}

		const cancelledBy =
			identityId === invitation.primaryIdentityId ? 'primary' : 'secondary';

		await invitationRepository.softDelete(
			invitation.subscriptionName,
			invitationCode,
			cancelledBy,
		);

		return {
			body: '',
			statusCode: 204,
		};
	} catch (error) {
		logger.error('Error deleting invitation', error);
		return internalServerError();
	}
};
