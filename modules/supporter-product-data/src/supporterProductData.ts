import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/utils/stage';

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
