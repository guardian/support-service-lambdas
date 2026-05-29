import { logger } from '@modules/logger/logger';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { type InvitationRepository } from './invitationRepository';

export const deleteInvitationBodySchema = z.object({
	invitationCode: z.string(),
	subscriptionName: z.string(),
});

export type DeleteInvitationBody = z.infer<typeof deleteInvitationBodySchema>;

export const deleteInvitationEndpoint =
	(invitationRepository: InvitationRepository) =>
	async (body: DeleteInvitationBody): Promise<APIGatewayProxyResult> => {
		const { subscriptionName, invitationCode } = body;
		logger.mutableAddContext(subscriptionName);

		await invitationRepository.delete(subscriptionName, invitationCode);

		return {
			body: 'DELETED',
			statusCode: 204,
		};
	};
