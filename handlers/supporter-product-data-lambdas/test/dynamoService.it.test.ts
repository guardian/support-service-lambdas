/**
 * @group integration
 */

import {
	DeleteItemCommand,
	DynamoDBClient,
	GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import dayjs from 'dayjs';
import { getAwsConfig } from '@modules/aws/config';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { DynamoService } from '../src/services/dynamoService';

const stage = 'CODE';
const tableName = `SupporterProductData-${stage}`;
const awsConfig = getAwsConfig('membership');
const client = new DynamoDBClient(awsConfig);

const baseItem = {
	identityId: 'integration-test-identity-id',
	productRatePlanId: 'rate-plan-id-123',
	productRatePlanName: 'Supporter Plus Monthly',
	termEndDate: dayjs('2027-01-01'),
	contractEffectiveDate: dayjs('2026-01-01'),
};

const primarySubscriptionTestItem: SupporterRatePlanItem = {
	...baseItem,
	subscriptionName: 'A-S00000001',
	primarySubscriptionName: 'A-S00009999',
};

const contributionTestItem: SupporterRatePlanItem = {
	...baseItem,
	subscriptionName: 'A-S00000002',
	contributionAmount: 5.0,
	contributionCurrency: 'GBP',
};

const missingCurrencyTestItem: SupporterRatePlanItem = {
	...baseItem,
	subscriptionName: 'A-S00000003',
	contributionAmount: 5.0,
};

const missingAmountTestItem: SupporterRatePlanItem = {
	...baseItem,
	subscriptionName: 'A-S00000004',
	contributionCurrency: 'GBP',
};

const staleFieldTestItem: SupporterRatePlanItem = {
	...baseItem,
	subscriptionName: 'A-S00000005',
	primarySubscriptionName: 'A-S00009999',
};

async function deleteItem(item: SupporterRatePlanItem) {
	await client.send(
		new DeleteItemCommand({
			TableName: tableName,
			Key: {
				identityId: { S: item.identityId },
				subscriptionName: { S: item.subscriptionName },
			},
		}),
	);
}

describe('DynamoService integration', () => {
	const service = new DynamoService(stage);

	afterEach(async () => {
		await deleteItem(primarySubscriptionTestItem);
		await deleteItem(contributionTestItem);
		await deleteItem(missingCurrencyTestItem);
		await deleteItem(missingAmountTestItem);
		await deleteItem(staleFieldTestItem);
	});

	test('writes primarySubscriptionName to DynamoDB', async () => {
		await service.writeItem(primarySubscriptionTestItem);

		const result = await client.send(
			new GetItemCommand({
				TableName: tableName,
				Key: {
					identityId: { S: primarySubscriptionTestItem.identityId },
					subscriptionName: { S: primarySubscriptionTestItem.subscriptionName },
				},
			}),
		);

		expect(result.Item).toBeDefined();
		expect(result.Item?.primarySubscriptionName).toEqual({
			S: primarySubscriptionTestItem.primarySubscriptionName,
		});
	});

	test('writes contributionAmount and contributionCurrency to DynamoDB', async () => {
		await service.writeItem(contributionTestItem);

		const result = await client.send(
			new GetItemCommand({
				TableName: tableName,
				Key: {
					identityId: { S: contributionTestItem.identityId },
					subscriptionName: { S: contributionTestItem.subscriptionName },
				},
			}),
		);

		expect(result.Item).toBeDefined();
		expect(result.Item?.contributionAmount).toEqual({
			N: contributionTestItem.contributionAmount?.toString(),
		});
		expect(result.Item?.contributionCurrency).toEqual({
			S: contributionTestItem.contributionCurrency,
		});
	});

	test('does not write contributionAmount or contributionCurrency when currency is missing', async () => {
		await service.writeItem(missingCurrencyTestItem);

		const result = await client.send(
			new GetItemCommand({
				TableName: tableName,
				Key: {
					identityId: { S: missingCurrencyTestItem.identityId },
					subscriptionName: { S: missingCurrencyTestItem.subscriptionName },
				},
			}),
		);

		expect(result.Item).toBeDefined();
		expect(result.Item?.contributionAmount).toBeUndefined();
		expect(result.Item?.contributionCurrency).toBeUndefined();
	});

	test('does not write contributionAmount or contributionCurrency when amount is missing', async () => {
		await service.writeItem(missingAmountTestItem);

		const result = await client.send(
			new GetItemCommand({
				TableName: tableName,
				Key: {
					identityId: { S: missingAmountTestItem.identityId },
					subscriptionName: { S: missingAmountTestItem.subscriptionName },
				},
			}),
		);

		expect(result.Item).toBeDefined();
		expect(result.Item?.contributionAmount).toBeUndefined();
		expect(result.Item?.contributionCurrency).toBeUndefined();
	});

	test('removes optional fields from a previous write when they are absent in an update', async () => {
		// First write includes primarySubscriptionName
		await service.writeItem(staleFieldTestItem);

		// Second write for the same item omits primarySubscriptionName
		await service.writeItem({
			...staleFieldTestItem,
			primarySubscriptionName: undefined,
		});

		const result = await client.send(
			new GetItemCommand({
				TableName: tableName,
				Key: {
					identityId: { S: staleFieldTestItem.identityId },
					subscriptionName: { S: staleFieldTestItem.subscriptionName },
				},
			}),
		);

		expect(result.Item?.primarySubscriptionName).toBeUndefined();
	});
});
