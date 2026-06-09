import {
	DynamoDBClient,
	UpdateItemCommand,
	type UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { logger } from '@modules/logger/logger';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export class DynamoWriteError extends Error {
	constructor(cause: unknown) {
		super(`Failed to write to Dynamo: ${String(cause)}`, { cause });
		this.name = 'DynamoWriteError';
	}
}

export class DynamoService {
	constructor(
		stage: Stage,
		private readonly tableName = `SupporterProductData-${stage}`,
		private readonly client = new DynamoDBClient(awsConfig),
	) {}

	formatAsTTL(date: Dayjs) {
		// Add a day because the user's entitlements last till the end of the day
		return date.add(1, 'day').unix().toString();
	}

	async writeItem(item: SupporterRatePlanItem): Promise<void> {
		logger.log('Writing supporter rate plan item to DynamoDB', {
			identityId: item.identityId,
			subscriptionName: item.subscriptionName,
			productRatePlanName: item.productRatePlanName,
		});

		const expressionValues: NonNullable<
			UpdateItemCommandInput['ExpressionAttributeValues']
		> = {
			':productRatePlanId': { S: item.productRatePlanId },
			':productRatePlanName': { S: item.productRatePlanName },
			':termEndDate': { S: zuoraDateFormat(item.termEndDate) },
			':contractEffectiveDate': {
				S: zuoraDateFormat(item.contractEffectiveDate),
			},
			':expiryDate': { N: this.formatAsTTL(item.termEndDate) },
		};

		let updateExpression =
			'SET productRatePlanId = :productRatePlanId, productRatePlanName = :productRatePlanName, termEndDate = :termEndDate, contractEffectiveDate = :contractEffectiveDate, expiryDate = :expiryDate';

		if (item.contributionAmount) {
			expressionValues[':contributionAmount'] = {
				N: item.contributionAmount.amount.toString(),
			};
			expressionValues[':contributionCurrency'] = {
				S: item.contributionAmount.currency,
			};
			updateExpression +=
				', contributionAmount = :contributionAmount, contributionCurrency = :contributionCurrency';
		}

		try {
			await this.client.send(
				new UpdateItemCommand({
					TableName: this.tableName,
					Key: {
						identityId: { S: item.identityId },
						subscriptionName: { S: item.subscriptionName },
					},
					UpdateExpression: updateExpression,
					ExpressionAttributeValues: expressionValues,
				}),
			);
		} catch (error) {
			throw new DynamoWriteError(error);
		}

		logger.log('Successfully wrote supporter rate plan item to DynamoDB', {
			identityId: item.identityId,
			subscriptionName: item.subscriptionName,
		});
	}
}
