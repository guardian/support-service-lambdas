import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import {
	internalServerError,
	notFound,
} from '@modules/routing/apiGatewayResponses';
import { type InvitationRepository } from './invitationRepository';

export const deleteInvitationPathSchema = z.object({
	invitationCode: z.string(),
});

export type DeleteInvitationPath = z.infer<typeof deleteInvitationPathSchema>;

export const deleteInvitationEndpoint =
	(invitationRepository: InvitationRepository) =>
	async (path: DeleteInvitationPath): Promise<APIGatewayProxyResult> => {
		const { invitationCode } = path;
		logger.mutableAddContext(invitationCode);

		try {
			const invitation = await invitationRepository.get(invitationCode);

			if (!invitation) {
				return notFound();
			}

			await invitationRepository.delete(
				invitation.subscriptionName,
				invitationCode,
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
