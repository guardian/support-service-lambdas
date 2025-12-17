import {
	DeleteItemCommand,
	DynamoDBClient,
	PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import type { PromoCampaign } from '@modules/promotions/v2/schema';
import type { Stage } from '@modules/stage';

const dynamoClient = new DynamoDBClient(awsConfig);

export const writeToDynamoDb = (
	campaign: PromoCampaign,
	stage: Stage,
): Promise<void> =>
	dynamoClient
		.send(
			new PutItemCommand({
				TableName: `support-admin-console-promo-campaigns-${stage}`,
				Item: marshall(campaign),
			}),
		)
		.then(() => undefined);

export const deleteFromDynamoDb = (
	campaign: PromoCampaign,
	stage: Stage,
): Promise<void> =>
	dynamoClient
		.send(
			new DeleteItemCommand({
				TableName: `support-admin-console-promo-campaigns-${stage}`,
				Key: marshall({ campaignCode: campaign.campaignCode }),
			}),
		)
		.then(() => undefined);
