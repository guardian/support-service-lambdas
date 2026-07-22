import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import dayjs from 'dayjs';
import { z } from 'zod';
import { createSecondarySubscription } from '@modules/multiple-account/secondarySubscription';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { secondaryUserTTLFromPrimarySubscriptionTTL } from '@modules/multiple-account/secondaryUserRepository';
import { getIfDefined } from '@modules/nullAndUndefined';
import {
	badRequest,
	buildErrorResponse,
	notFound,
	ok,
} from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';
import { getSupporterRatePlan } from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { InvitationRepository } from './invitationRepository';

export const acceptInvitationPathSchema = z.object({
	invitationCode: z.string(),
});

export const acceptInvitationEndpoint = async (
	stage: Stage,
	signedInUserId: string,
	invitationCode: string,
	invitationRepository: InvitationRepository,
	secondaryUserRepository: SecondaryUserRepository,
	dynamoClient: DynamoDBClient,
) => {
	try {
		const invitation = await invitationRepository.get(invitationCode);

		if (!invitation) {
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
			acceptedDate: zuoraDateFormat(today),
			expiryDate: secondaryUserTTLFromPrimarySubscriptionTTL(
				parentSupporterProductDataRecord.termEndDate,
			),
		};

		const createSecondaryUserTransaction =
			secondaryUserRepository.getPutTransaction(secondaryUserRecord);
		const deleteInvitationTransaction =
			invitationRepository.getDeleteTransaction(
				invitation.subscriptionName,
				invitationCode,
			);

		// Carry out the secondary user creation and deletion of the invitation
		// in a transaction to keep them atomic
		await dynamoClient.send(
			new TransactWriteItemsCommand({
				TransactItems: [
					createSecondaryUserTransaction,
					deleteInvitationTransaction,
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

		// TODO: email?
		return ok({
			identityId: secondaryIdentityId,
			secondarySubscriptionName,
		});
	} catch (error) {
		return buildErrorResponse(error);
	}
};
