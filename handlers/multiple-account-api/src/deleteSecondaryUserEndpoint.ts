import {
	type DynamoDBClient,
	TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { secondarySubscriptionName } from '@modules/multiple-account/secondarySubscription';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import {
	badRequest,
	buildErrorResponse,
	notFound,
} from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';
import { getDeleteSupporterRatePlanTransaction } from '@modules/supporter-product-data/supporterProductData';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { sendLeaveSubscriptionEmail } from './emails/leaveSubcriptionEmail';

export const deleteSecondaryUserPathSchema = z.object({
	subscriptionName: z.string(),
	secondaryIdentityId: z.string(),
});

export type DeleteSecondaryUserPath = z.infer<
	typeof deleteSecondaryUserPathSchema
>;

export const deleteSecondaryUserEndpoint = async (
	stage: Stage,
	secondaryUserRepository: SecondaryUserRepository,
	dynamoClient: DynamoDBClient,
	zuoraClient: ZuoraClient,
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
		const zuoraSubscription = await getSubscription(
			zuoraClient,
			subscriptionName,
		);
		const account = await getAccount(
			zuoraClient,
			zuoraSubscription.accountNumber,
		);

		if (cancelledBy === 'secondary') {
			await sendLeaveSubscriptionEmail(
				stage,
				account.billToContact.firstName,
				account.billToContact.workEmail,
				secondaryUser.secondaryEmail,
				secondaryIdentityId,
			);
		}

		return {
			statusCode: 204,
			body: '',
		};
	} catch (error) {
		return buildErrorResponse(error);
	}
};
