import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import dayjs from 'dayjs';
import { createSecondarySubscription } from '@modules/multiple-account/secondarySubscription';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { secondaryUserTTLFromPrimarySubscriptionTTL } from '@modules/multiple-account/secondaryUserRepository';
import { getIfDefined } from '@modules/nullAndUndefined';
import {
	badRequest,
	buildErrorResponse,
	gone,
	notFound,
	ok,
} from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';
import { getSupporterRatePlan } from '@modules/supporter-product-data/supporterProductData';
import { sendInvitationRedeemedEmail } from './emails/acceptInvitationEmail';
import type { InvitationRepository } from './invitationRepository';

export const acceptInvitationEndpoint = async (
	stage: Stage,
	invitationRepository: InvitationRepository,
	secondaryUserRepository: SecondaryUserRepository,
	dynamoClient: DynamoDBClient,
	signedInUserId: string,
	invitationCode: string,
) => {
	try {
		const invitation = await invitationRepository.get(invitationCode);

		// Invitations are soft-accepted, so they may still exist with an
		// acceptedDate set.
		if (invitation?.acceptedDate) {
			return gone('Invitation has already been accepted');
		}

		if (!invitation) {
			// The invitation may be missing because a soft-accepted invitation's
			// retention period (used to allow time for export to the data
			// platform) has expired and the record has been removed by DynamoDB's
			// TTL. If a secondary user record already exists for this invitation
			// code, the user has already accepted it previously.
			const alreadyAccepted = (
				await secondaryUserRepository.listByIdentity(signedInUserId)
			).some(
				(secondaryUser) => secondaryUser.invitationCode === invitationCode,
			);

			if (alreadyAccepted) {
				return gone('Invitation has already been accepted');
			}

			return notFound();
		}

		if (signedInUserId !== invitation.secondaryIdentityId) {
			return badRequest('Incorrect user');
		}

		if (invitation.cancelledBy !== undefined) {
			return badRequest(
				`Invitation has been cancelled by the ${invitation.cancelledBy} user`,
			);
		}

		const { subscriptionName, secondaryIdentityId, primaryIdentityId } =
			invitation;

		const parentSupporterProductDataRecord = getIfDefined(
			await getSupporterRatePlan(stage, primaryIdentityId, subscriptionName),
			`Supporter rate plan record not found for ${subscriptionName} and identity ${primaryIdentityId}`,
		);
		const today = dayjs();

		const secondaryUserRecord = {
			subscriptionName,
			secondaryIdentityId,
			primaryIdentityId,
			acceptedDate: today.toISOString(),
			expiryDate: secondaryUserTTLFromPrimarySubscriptionTTL(
				parentSupporterProductDataRecord.termEndDate,
			),
			invitationCode,
		};

		const createSecondaryUserTransaction =
			secondaryUserRepository.getPutTransaction(secondaryUserRecord);
		const acceptInvitationTransaction =
			invitationRepository.getAcceptTransaction(
				invitation.subscriptionName,
				invitationCode,
			);

		// Carry out the secondary user creation and soft-accepting of the
		// invitation in a transaction to keep them atomic
		await dynamoClient.send(
			new TransactWriteItemsCommand({
				TransactItems: [
					createSecondaryUserTransaction,
					acceptInvitationTransaction,
				],
			}),
		);

		// This record is not part of the transaction because it is sent via an SQS queue
		// If there is an issue with it it will be debugged and retried there
		const secondarySubscriptionName = await createSecondarySubscription(
			stage,
			parentSupporterProductDataRecord,
			invitation.secondaryIdentityId,
			today,
		);

		await sendInvitationRedeemedEmail(stage, {
			primaryUserIdentityId: primaryIdentityId,
			primaryUserFirstName: invitation.primaryUserFirstName,
			primaryUserEmail: invitation.primaryUserEmail,
			secondaryUserEmail: invitation.secondaryUserEmail,
			secondaryUserIdentityId: invitation.secondaryIdentityId,
		});

		return ok({
			identityId: secondaryIdentityId,
			secondarySubscriptionName,
		});
	} catch (error) {
		return buildErrorResponse(error);
	}
};
