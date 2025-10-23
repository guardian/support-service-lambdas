import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { sendMessageToQueue } from '@modules/aws/sqs';
import { prettyPrint } from '@modules/prettyPrint';
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

// We insert into the SupporterProductData table via an SQS queue to keep all the logic around formatting and TTLs in one place
export const sendToSupporterProductData = async (
	stage: Stage,
	supporterRatePlanItem: SupporterRatePlanItem,
) => {
	const queueName = `supporter-product-data-${stage}`;
	const messageBody = prettyPrint(supporterRatePlanItem);
	logger.log(
		`Sending supporter product data message ${messageBody} to queue ${queueName}`,
	);

	const response = await sendMessageToQueue({
		queueName,
		messageBody,
	});

	logger.log(
		`Response from supporter product data send was ${prettyPrint(response)}`,
	);
	return response;
};
