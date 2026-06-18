import {
	type AttributeValue,
	DynamoDBClient,
	UpdateItemCommand,
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

		// Fields which are always updated by this function
		const setFields: Array<{ name: string; value: AttributeValue }> = [
			{ name: 'productRatePlanId', value: { S: item.productRatePlanId } },
			{ name: 'productRatePlanName', value: { S: item.productRatePlanName } },
			{ name: 'termEndDate', value: { S: zuoraDateFormat(item.termEndDate) } },
			{ name: 'expiryDate', value: { N: this.formatAsTTL(item.termEndDate) } },
		];

		// Fields which are only set if they do not already exist
		const ifNotExistsFields: Array<{ name: string; value: AttributeValue }> = [
			{
				name: 'contractEffectiveDate',
				value: { S: zuoraDateFormat(item.contractEffectiveDate) },
			},
		];

		// Fields which are removed if they do not exist in the supplied item.
		// This is to prevent stale data in the data store if for instance the first
		// version of a record contains optional fields but a later version does not
		const fieldsToRemove: string[] = [];

		if (item.contributionAmount && item.contributionCurrency) {
			setFields.push(
				{
					name: 'contributionAmount',
					value: { N: item.contributionAmount.toString() },
				},
				{
					name: 'contributionCurrency',
					value: { S: item.contributionCurrency },
				},
			);
		} else {
			fieldsToRemove.push('contributionAmount', 'contributionCurrency');
		}

		// This will only be set for secondary subscriptions granted through the multiple accounts feature
		if (item.primarySubscriptionName) {
			setFields.push({
				name: 'primarySubscriptionName',
				value: { S: item.primarySubscriptionName },
			});
		} else {
			fieldsToRemove.push('primarySubscriptionName');
		}

		// Build the update expression for the DynamoDB update operation
		const setClause = `SET ${setFields.map(({ name }) => `${name} = :${name}`).join(', ')},`;
		const ifNotExistsClause = `${ifNotExistsFields.map(({ name }) => `${name} = if_not_exists(${name}, :${name})`).join(', ')}`;
		const removeClause =
			fieldsToRemove.length > 0 ? `REMOVE ${fieldsToRemove.join(', ')}` : '';
		const updateExpression = `${setClause} ${ifNotExistsClause} ${removeClause}`;

		// Build the expression attribute values for the DynamoDB update operation
		const expressionValues = Object.fromEntries(
			setFields
				.concat(ifNotExistsFields)
				.map(({ name, value }) => [`:${name}`, value]),
		);
		
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
