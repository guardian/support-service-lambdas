import {
	type DynamoDBClient,
	TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { secondarySubscriptionName } from '@modules/multiple-account/secondarySubscription';
import type { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { buildErrorResponse } from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';
import { getDeleteSupporterRatePlanTransaction } from '@modules/supporter-product-data/supporterProductData';

export const deleteSecondaryUserPathSchema = z.object({
	subscriptionName: z.string(),
	secondaryIdentityId: z.string(),
});

export type DeleteSecondaryUserPath = z.infer<
	typeof deleteSecondaryUserPathSchema
>;

export const deleteSecondaryUserEndpoint =
	(
		stage: Stage,
		secondaryUserRepository: SecondaryUserRepository,
		dynamoClient: DynamoDBClient,
	) =>
	async (path: DeleteSecondaryUserPath): Promise<APIGatewayProxyResult> => {
		try {
			const { subscriptionName, secondaryIdentityId } = path;
			const composedSubscriptionName = secondarySubscriptionName(
				subscriptionName,
				secondaryIdentityId,
			);
			logger.mutableAddContext(composedSubscriptionName);

			// Carry out the secondary user deletion and deletion of the support product data record
			// in a transaction to keep them atomic
			await dynamoClient.send(
				new TransactWriteItemsCommand({
					TransactItems: [
						secondaryUserRepository.getDeleteTransaction(
							subscriptionName,
							secondaryIdentityId,
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
