import { getUserByIdentityId } from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/logger/logger';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getIfDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { InvitationRepository } from './invitationRepository';
import type { ListSecondaryUsersBody } from './listSecondaryUsersEndpoint';

export const mmaPrimarySummaryEndpoint =
	(
		invitationRepository: InvitationRepository,
		secondaryUserRepository: SecondaryUserRepository,
		identityClient: IdentityClient,
	) =>
	async ({ subscriptionName }: ListSecondaryUsersBody) => {
		try {
			logger.mutableAddContext(subscriptionName);
			const invitations = invitationRepository.list(subscriptionName);
			const secondaryUsers = await getSecondaryUserListWithNames(
				subscriptionName,
				secondaryUserRepository,
				identityClient,
			);

			return ok({ invitations, secondaryUsers });
		} catch (error) {
			return buildErrorResponse(error);
		}
	};

const getSecondaryUserListWithNames = async (
	subscriptionName: string,
	secondaryUserRepository: SecondaryUserRepository,
	identityClient: IdentityClient,
) => {
	const secondaryUsers = await secondaryUserRepository.list(subscriptionName);

	return Promise.all(
		secondaryUsers.map(async (secondaryUser) => {
			const userDetails = getIfDefined(
				await getUserByIdentityId(
					identityClient,
					secondaryUser.secondaryIdentityId,
				),
				`No identity details found for secondary user ${prettyPrint(secondaryUser)}`,
			);
			return {
				...secondaryUser,
				name: userDetails.publicFields.displayName,
			};
		}),
	);
};
