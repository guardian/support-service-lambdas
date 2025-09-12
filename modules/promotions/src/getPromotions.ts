import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import { type Promotion, promotionSchema } from './schema';

const dynamoClient = new DynamoDBClient(awsConfig);

export const getPromotions = async (
	stage: Stage,
): Promise<Promotion[] | undefined> => {
	const tableName = `MembershipSub-Promotions-${stage}`;
	const input = {
		TableName: tableName,
	};
	console.log(`Querying ${tableName}`);
	const data = await dynamoClient.send(new ScanCommand(input));

	return data.Items?.map((item) => {
		const parseResult = promotionSchema.safeParse(unmarshall(item));
		if (!parseResult.success) {
			console.error(
				`Failed to parse promotion: ${JSON.stringify(item, null, 2)} because of error:`,
				parseResult.error,
			);
			throw new Error('Failed to parse promotion');
		}
		return parseResult.data;
	});
};

export const getPromotionByCode = async (stage: Stage, code: string) => {
	const promotions = await getPromotions(stage);
	return promotions?.find((promo) => {
		const allCodes = Object.values(promo.codes).flat();
		return allCodes.includes(code);
	});
};
