import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
	region: process.env.region,
});

export const putItem = async ({
	tableName,
	identityId,
	subscriptionName,
	productRatePlanId,
	productRatePlanName,
	contributionAmount,
	contributionCurrency,
	contractEffectiveDate,
	termEndDate,
}: {
	tableName: string;
	identityId: string;
	subscriptionName: string;
	productRatePlanId: string;
	productRatePlanName: string;
	contributionAmount: number;
	contributionCurrency: string;
	contractEffectiveDate: string;
	termEndDate: string;
}) => {
	const item = {
		identityId: { S: identityId },
		subscriptionName: { S: subscriptionName },
		productRatePlanId: { S: productRatePlanId },
		productRatePlanName: { S: productRatePlanName },
		contributionAmount: { N: contributionAmount.toString() },
		contributionCurrency: { S: contributionCurrency },
		contractEffectiveDate: { S: contractEffectiveDate },
		termEndDate: { S: termEndDate },
	};

	console.info(item);

	const command = new PutItemCommand({
		TableName: tableName,
		Item: item,
	});

	try {
		const response = await client.send(command);
		console.log('Item successfully saved:', response);
	} catch (error) {
		console.error('Error saving item:', error);
	}
};
