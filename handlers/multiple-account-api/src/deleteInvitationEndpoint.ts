import { logger } from '@modules/logger/logger';
import {
	internalServerError,
	notFound,
} from '@modules/routing/apiGatewayResponses';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
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

		const invitation =
			await invitationRepository.getByInvitationCode(invitationCode);

		if (invitation.length > 1) {
			logger.error(
				`Multiple invitations found for invitation code ${invitationCode}`,
				{ invitationCount: invitation.length },
			);
			return internalServerError();
		}

		const [invitationToDelete] = invitation;

		if (!invitationToDelete) {
			return notFound();
		}

		const { subscriptionName } = invitationToDelete;

		await invitationRepository.delete(subscriptionName, invitationCode);

		return {
			body: '',
			statusCode: 204,
		};
	};
