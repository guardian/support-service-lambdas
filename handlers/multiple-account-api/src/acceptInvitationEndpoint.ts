import {
	badRequest,
	buildErrorResponse,
	ok,
} from '@modules/routing/apiGatewayResponses';
import { z } from 'zod';
import type { InvitationRepository } from './invitationRepository';

export const acceptInvitationBodySchema = z.object({
	invitationCode: z.string(),
});

export const acceptInvitationEndpoint = async (
	signedInUserId: string,
	invitationCode: string,
	invitationRepository: InvitationRepository,
) => {
	try {
		const invitation = await invitationRepository.get(invitationCode);
		if (signedInUserId !== invitation?.secondaryIdentityId) {
			return badRequest('Incorrect user');
		}

		return ok({});
	} catch (error) {
		return buildErrorResponse(error);
	}
};
