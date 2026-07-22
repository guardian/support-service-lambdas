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
	invitationRecordSchema,
	type InvitationRepository,
} from './invitationRepository';

export const mmaPrimarySummaryResponseSchema = z.object({
	invitations: z.array(
		invitationRecordSchema.omit({ cancelledBy: true, cancelledDate: true }),
	),
	secondaryUsers: z.array(
		secondaryUserRecordSchema.extend({
			email: z.string().optional(),
			displayName: z.string().optional(),
			firstName: z.string().optional(),
			lastName: z.string().optional(),
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

		const nonCancelledInvitations =
			await invitationRepository.listNonCancelled(subscriptionName);

		const secondaryUsers = await getSecondaryUserListWithNames(
			subscriptionName,
			secondaryUserRepository,
			identityClient,
		);

		return ok(
			{ invitations: nonCancelledInvitations, secondaryUsers },
			mmaPrimarySummaryResponseSchema,
		);
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
		secondaryUsers.map(async (secondaryUser) =>
			getSecondaryUserWithName(identityClient, secondaryUser),
		),
	);
};

const getSecondaryUserWithName = async (
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
		displayName: userDetails.publicFields.displayName,
		firstName: userDetails.privateFields.firstName,
		lastName: userDetails.privateFields.secondName,
		email: userDetails.primaryEmailAddress,
	};
};
