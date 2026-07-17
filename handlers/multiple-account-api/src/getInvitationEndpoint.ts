import type { APIGatewayProxyResult } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import {
	internalServerError,
	notFound,
	ok,
} from '@modules/routing/apiGatewayResponses';
import { type InvitationRepository } from './invitationRepository';

export const getInvitationEndpoint =
	(invitationRepository: InvitationRepository) =>
	async (path: DeleteInvitationPath): Promise<APIGatewayProxyResult> => {
		const { invitationCode } = path;
		logger.mutableAddContext(invitationCode);

		try {
			const invitation = await invitationRepository.get(invitationCode);

			if (!invitation) {
				return notFound();
			}

			return ok({ invitation });
		} catch (error) {
			logger.error('Error retrieving invitation', error);
			return internalServerError();
		}
	};
