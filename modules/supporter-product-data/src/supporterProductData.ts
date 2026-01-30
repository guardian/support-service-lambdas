import * as console from 'node:console';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { sendMessageToQueue } from '@modules/aws/sqs';
import { prettyPrint } from '@modules/prettyPrint';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import { z } from 'zod';

const dynamoClient = new DynamoDBClient(awsConfig);

const supporterRatePlanItemSchema = z.object({
	subscriptionName: z.string(), // Unique identifier for the subscription
	identityId: z.string(), // Unique identifier for user
	productRatePlanId: z.string(), // Unique identifier for the product in this rate plan
	productRatePlanName: z.string(), // Name of the product in this rate plan
	termEndDate: z.string().transform((arg) => dayjs(arg)), // Date that this subscription term ends
	contractEffectiveDate: z.string().transform((arg) => dayjs(arg)), // Date that this subscription started
});
export type SupporterRatePlanItem = z.infer<typeof supporterRatePlanItemSchema>;

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

	return data.Items?.map((item) => {
		const unmarshalled = unmarshall(item);
		const parseResult = supporterRatePlanItemSchema.safeParse(unmarshalled);
		if (!parseResult.success) {
			console.error(
				`Failed to parse supporter product data: ${prettyPrint(unmarshalled)} because of error:`,
				parseResult.error,
			);
			throw new Error('Failed to parse supporter product data');
		}
		return parseResult.data;
	});
};

// Custom replacer to format dates as 'YYYY-MM-DD' strings in JSON
const supporterRatePlanDateReplacer = (key: string, value: unknown) => {
	if (
		typeof value === 'string' &&
		['termEndDate', 'contractEffectiveDate'].includes(key)
	) {
		return zuoraDateFormat(dayjs(value));
	}
	return value;
};

// We insert into the SupporterProductData table via an SQS queue to keep all the logic around formatting and TTLs in one place
// This is the lambda that ultimately does the writing:
// https://github.com/guardian/support-frontend/blob/main/supporter-product-data/src/main/scala/com/gu/lambdas/ProcessSupporterRatePlanItemLambda.scala#L24
export const sendToSupporterProductData = async (
	stage: Stage,
	supporterRatePlanItem: SupporterRatePlanItem,
) => {
	const queueName = `supporter-product-data-${stage}`;
	const messageBody = JSON.stringify(
		supporterRatePlanItem,
		supporterRatePlanDateReplacer,
		2,
	);
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
