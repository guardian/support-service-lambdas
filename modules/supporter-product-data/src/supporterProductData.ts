import {
	DynamoDBClient,
	PutItemCommand,
	QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';

const dynamoClient = new DynamoDBClient(awsConfig);

export type SupporterRatePlanItem = {
	subscriptionName: string; // Unique identifier for the subscription
	identityId: string; // Unique identifier for user
	productRatePlanId: string; // Unique identifier for the product in this rate plan
	productRatePlanName: string; // Name of the product in this rate plan
	termEndDate: string; // Date that this subscription term ends
	contractEffectiveDate: string; // Date that this subscription started
};

export const getSupporterProductData = async (
	stage: Stage,
	identityId: string,
): Promise<SupporterRatePlanItem[] | undefined> => {
	const tableName = `SupporterProductData-${stage}`;
	const input = {
		ExpressionAttributeValues: {
			':v1': {
				S: identityId,
			},
		},
		KeyConditionExpression: 'identityId = :v1',
		TableName: tableName,
	};
	console.log(`Querying ${tableName} for identityId ${identityId}`);
	const data = await dynamoClient.send(new QueryCommand(input));
	console.log(`Query returned ${JSON.stringify(data)}`);
	return data.Items?.map((item) => unmarshall(item) as SupporterRatePlanItem);
};

export const putSupporterProductData = async (
	stage: Stage,
	items: SupporterRatePlanItem[],
): Promise<void> => {
	const tableName = `SupporterProductData-${stage}`;
	for (const item of items) {
		const cmd = new PutItemCommand({
			TableName: tableName,
			Item: {
				identityId: { S: item.identityId },
				subscriptionName: { S: item.subscriptionName },
				productRatePlanId: { S: item.productRatePlanId },
				productRatePlanName: { S: item.productRatePlanName },
				termEndDate: { S: item.termEndDate },
				contractEffectiveDate: { S: item.contractEffectiveDate },
			},
		});
		logger.log(`Putting item into ${tableName}: ${JSON.stringify(item)}`);
		await dynamoClient.send(cmd);
	}
};
