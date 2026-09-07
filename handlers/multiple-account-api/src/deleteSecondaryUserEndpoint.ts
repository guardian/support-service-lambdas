import {
	type DynamoDBClient,
	TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { getUserByIdentityId } from '@modules/identity/idapi';
import type { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/logger/logger';
import { secondarySubscriptionName } from '@modules/multiple-account/secondarySubscription';
import { type SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import {
	badRequest,
	buildErrorResponse,
	notFound,
} from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';
import { getDeleteSupporterRatePlanTransaction } from '@modules/supporter-product-data/supporterProductData';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	sendLeaveSubscriptionEmailToPrimary,
	sendLeaveSubscriptionEmailToSecondary,
} from './emails/leaveSubcriptionEmail';

export const deleteSecondaryUserPathSchema = z.object({
	subscriptionName: z.string(),
	secondaryIdentityId: z.string(),
});

export type DeleteSecondaryUserPath = z.infer<
	typeof deleteSecondaryUserPathSchema
>;

const getZuoraAccount = async (
	zuoraClient: ZuoraClient,
	subscriptionName: string,
): Promise<ZuoraAccount> => {
	const zuoraSubscription = await getSubscription(
		zuoraClient,
		subscriptionName,
	);

	return getAccount(zuoraClient, zuoraSubscription.accountNumber);
};

export const deleteSecondaryUserEndpoint = async (
	stage: Stage,
	secondaryUserRepository: SecondaryUserRepository,
	dynamoClient: DynamoDBClient,
	zuoraClient: ZuoraClient,
	identityClient: IdentityClient,
	subscriptionName: string,
	secondaryIdentityId: string,
	loggedInUserIdentityId: string,
): Promise<APIGatewayProxyResult> => {
	try {
		const composedSubscriptionName = secondarySubscriptionName(
			subscriptionName,
			secondaryIdentityId,
		);
		logger.mutableAddContext(composedSubscriptionName);

		const secondaryUser =
			await secondaryUserRepository.getNonCancelledBySubscriptionAndIdentity(
				subscriptionName,
				secondaryIdentityId,
			);

		if (!secondaryUser) {
			return notFound();
		}

		if (
			loggedInUserIdentityId !== secondaryUser.primaryIdentityId &&
			loggedInUserIdentityId !== secondaryUser.secondaryIdentityId
		) {
			return badRequest(
				'The x-identity-id does not match the primary or secondary user of this subscription',
			);
		}

		const cancelledBy =
			loggedInUserIdentityId === secondaryUser.primaryIdentityId
				? 'primary'
				: 'secondary';

		// Soft delete the secondary user record (retaining it so we can tell who
		// removed it, until DynamoDB's TTL removes it) but hard delete the
		// supporter product data record so the benefit is removed immediately.
		// These are carried out in a transaction to keep them atomic.
		await dynamoClient.send(
			new TransactWriteItemsCommand({
				TransactItems: [
					secondaryUserRepository.getSoftDeleteTransaction(
						subscriptionName,
						secondaryIdentityId,
						cancelledBy,
					),
					getDeleteSupporterRatePlanTransaction(
						stage,
						secondaryIdentityId,
						composedSubscriptionName,
					),
				],
			}),
		);

		if (cancelledBy === 'secondary') {
			const [account, secondaryUserDetails] = await Promise.all([
				getZuoraAccount(zuoraClient, subscriptionName),
				getUserByIdentityId(identityClient, secondaryIdentityId),
			]);

			if (!secondaryUserDetails?.primaryEmailAddress) {
				throw new Error('Secondary user does not have email address');
			}

			const primaryFirstName = account.billToContact.firstName;
			const primaryEmail = account.billToContact.workEmail;
			await Promise.all([
				sendLeaveSubscriptionEmailToSecondary(stage, {
					primaryUserFirstName: primaryFirstName,
					primaryUserEmail: primaryEmail,
					secondaryUserEmail: secondaryUserDetails.primaryEmailAddress,
					secondaryUserIdentityId: secondaryIdentityId,
				}),
				sendLeaveSubscriptionEmailToPrimary(stage, {
					primaryUserEmail: primaryEmail,
					primaryUserIdentityId: secondaryUser.primaryIdentityId,
				}),
			]);
		}

		return {
			statusCode: 204,
			body: '',
		};
	} catch (error) {
		return buildErrorResponse(error);
	}
};
