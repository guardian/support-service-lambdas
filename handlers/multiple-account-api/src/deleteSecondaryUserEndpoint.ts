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

		const secondaryUser = await secondaryUserRepository.getFromSubscription(
			secondaryIdentityId,
			subscriptionName,
		);

		if (!secondaryUser || secondaryUser.cancelledBy !== undefined) {
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

		return {
			statusCode: 204,
			body: '',
		};
	} catch (error) {
		return buildErrorResponse(error);
	}
};
