import { z } from 'zod';
import { getUserByIdentityId } from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/logger/logger';
import type {
	SecondaryUserRecord,
	SecondaryUserRepository,
} from '@modules/multiple-account/secondaryUserRepository';
import { secondaryUserRecordSchema } from '@modules/multiple-account/secondaryUserRepository';
import { prettyPrint } from '@modules/prettyPrint';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import {
	activeInvitationRecordSchema,
	type InvitationRepository,
} from './invitationRepository';

export const mmaPrimarySummaryResponseSchema = z.object({
	invitations: z.array(activeInvitationRecordSchema),
	secondaryUsers: z.array(
		secondaryUserRecordSchema.extend({
			email: z.string().optional(),
		}),
	),
});

export const mmaPrimarySummaryEndpoint = async (
	invitationRepository: InvitationRepository,
	secondaryUserRepository: SecondaryUserRepository,
	identityClient: IdentityClient,
	subscriptionName: string,
) => {
	try {
		logger.mutableAddContext(subscriptionName);

		const activeInvitations =
			await invitationRepository.listActive(subscriptionName);

		const activeSecondaryUsers = await getActiveSecondaryUserListWithNames(
			subscriptionName,
			secondaryUserRepository,
			identityClient,
		);

		return ok(
			{
				invitations: activeInvitations,
				secondaryUsers: activeSecondaryUsers,
			},
			mmaPrimarySummaryResponseSchema,
		);
	} catch (error) {
		return buildErrorResponse(error);
	}
};

const getActiveSecondaryUserListWithNames = async (
	subscriptionName: string,
	secondaryUserRepository: SecondaryUserRepository,
	identityClient: IdentityClient,
) => {
	const secondaryUsers =
		await secondaryUserRepository.listActiveBySubscription(subscriptionName);

	return Promise.all(
		secondaryUsers.map(async (secondaryUser) =>
			getSecondaryUserWithEmail(identityClient, secondaryUser),
		),
	);
};

const getSecondaryUserWithEmail = async (
	identityClient: IdentityClient,
	secondaryUser: SecondaryUserRecord,
) => {
	const userDetails = await getUserByIdentityId(
		identityClient,
		secondaryUser.secondaryIdentityId,
	);

	if (!userDetails) {
		throw new Error(
			`No identity details found for secondary user ${prettyPrint(secondaryUser)}`,
		);
	}

	return {
		...secondaryUser,
		email: userDetails.primaryEmailAddress,
	};
};
