import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { sendMessageToQueue } from '@modules/aws/sqs';
import { logger } from '@modules/logger/logger';
import { prettyPrint } from '@modules/prettyPrint';
import type { Stage } from '@modules/stage';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import { z } from 'zod';

const supporterRatePlanItemSchema = z.object({
	subscriptionName: z.string(), // Unique identifier for the subscription
	identityId: z.string(), // Unique identifier for user
	productRatePlanId: z.string(), // Unique identifier for the product in this rate plan
	productRatePlanName: z.string(), // Name of the product in this rate plan
	termEndDate: z.string().transform((arg) => dayjs(arg)), // Date that this subscription term ends
	contractEffectiveDate: z.string().transform((arg) => dayjs(arg)), // Date that this subscription started
	parentSubscriptionName: z.string().optional(), // Set for child subscriptions granted through the multiple accounts feature
});
export type SupporterRatePlanItem = z.infer<typeof supporterRatePlanItemSchema>;

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

export class SupporterProductDataRepository {
	constructor(
		private readonly client: DynamoDBClient,
		private readonly stage: Stage,
	) {}

	static create(stage: Stage): SupporterProductDataRepository {
		return new SupporterProductDataRepository(
			new DynamoDBClient(awsConfig),
			stage,
		);
	}

	async get(identityId: string): Promise<SupporterRatePlanItem[] | undefined> {
		const tableName = `SupporterProductData-${this.stage}`;
		const input = {
			ExpressionAttributeValues: {
				':v1': { S: identityId },
			},
			KeyConditionExpression: 'identityId = :v1',
			TableName: tableName,
		};
		logger.log(`Querying ${tableName} for identityId ${identityId}`);
		const data = await this.client.send(new QueryCommand(input));
		logger.log(`Query returned ${JSON.stringify(data)}`);

		return data.Items?.map((item) => {
			const unmarshalled = unmarshall(item);
			const parseResult = supporterRatePlanItemSchema.safeParse(unmarshalled);
			if (!parseResult.success) {
				logger.log(
					`Failed to parse supporter product data: ${prettyPrint(unmarshalled)} because of error: ${prettyPrint(parseResult.error)}`,
				);
				throw new Error('Failed to parse supporter product data');
			}
			return parseResult.data;
		});
	}

	// We insert into the SupporterProductData table via an SQS queue to keep all the logic around formatting and TTLs in one place
	// This is the lambda that ultimately does the writing:
	// https://github.com/guardian/support-frontend/blob/main/supporter-product-data/src/main/scala/com/gu/lambdas/ProcessSupporterRatePlanItemLambda.scala#L24
	async send(supporterRatePlanItem: SupporterRatePlanItem) {
		const queueName = `supporter-product-data-${this.stage}`;
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
	}
}
