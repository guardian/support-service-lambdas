import {
	type DynamoDBClient,
	TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { logger } from '@modules/logger/logger';
import { buildErrorResponse } from '@modules/routing/apiGatewayResponses';
import type { Stage } from '@modules/stage';
import { getDeleteSupporterRatePlanTransaction } from '@modules/supporter-product-data/supporterProductData';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { buildComposedSubscriptionName } from './helpers';
import type { SecondaryUserRepository } from './secondaryUserRepository';

export const deleteSecondaryUserBodySchema = z.object({
	subscriptionName: z.string(),
	secondaryIdentityId: z.string(),
});

export type DeleteSecondaryUserBody = z.infer<
	typeof deleteSecondaryUserBodySchema
>;

export const deleteSecondaryUserEndpoint =
	(
		stage: Stage,
		secondaryUserRepository: SecondaryUserRepository,
		dynamoClient: DynamoDBClient,
	) =>
	async (body: DeleteSecondaryUserBody): Promise<APIGatewayProxyResult> => {
		try {
			const { subscriptionName, secondaryIdentityId } = body;
			const composedSubscriptionName = buildComposedSubscriptionName(
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
