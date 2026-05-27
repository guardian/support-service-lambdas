import {
	DynamoDBClient,
	UpdateItemCommand,
	type UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { Stage } from '@modules/stage';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { SupporterRatePlanItem } from '../model/supporterRatePlanItem';

dayjs.extend(utc);

const epochSecondFromIsoDate = (isoDate: string): string =>
	dayjs.utc(isoDate).unix().toString();

const nextDay = (isoDate: string): string =>
	dayjs.utc(isoDate).add(1, 'day').format('YYYY-MM-DD');

export class DynamoService {
	constructor(
		stage: Stage,
		private readonly tableName = process.env
			.SUPPORTER_PRODUCT_DATA_TABLE_NAME ?? `SupporterProductData-${stage}`,
		private readonly client = new DynamoDBClient({
			region: 'eu-west-1',
			credentials: defaultProvider(),
		}),
	) {}

	async writeItem(item: SupporterRatePlanItem): Promise<void> {
		const expiryDate = nextDay(item.termEndDate);

		console.info('Writing supporter rate plan item to DynamoDB', {
			tableName: this.tableName,
			identityId: item.identityId,
			subscriptionName: item.subscriptionName,
			termEndDate: item.termEndDate,
			expiryDate,
			hasContributionAmount: item.contributionAmount !== undefined,
		});

		const expressionValues: NonNullable<
			UpdateItemCommandInput['ExpressionAttributeValues']
		> = {
			':productRatePlanId': { S: item.productRatePlanId },
			':productRatePlanName': { S: item.productRatePlanName },
			':termEndDate': { S: item.termEndDate },
			':contractEffectiveDate': { S: item.contractEffectiveDate },
			':expiryDate': { N: epochSecondFromIsoDate(expiryDate) },
		};

		let updateExpression =
			'SET productRatePlanId = :productRatePlanId, productRatePlanName = :productRatePlanName, termEndDate = :termEndDate, contractEffectiveDate = :contractEffectiveDate, expiryDate = :expiryDate';

		if (item.contributionAmount !== undefined) {
			expressionValues[':contributionAmount'] = {
				N: item.contributionAmount.amount,
			};
			expressionValues[':contributionCurrency'] = {
				S: item.contributionAmount.currency,
			};
			updateExpression +=
				', contributionAmount = :contributionAmount, contributionCurrency = :contributionCurrency';
		}

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

		console.info('Successfully wrote supporter rate plan item to DynamoDB', {
			tableName: this.tableName,
			identityId: item.identityId,
			subscriptionName: item.subscriptionName,
		});
	}
}
