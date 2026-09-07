import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import { logger } from '@modules/logger/logger';
import type { Stage } from '@modules/stage';
import type { Promo } from './schema';
import { promoSchema } from './schema';

const dynamoClient = new DynamoDBClient(awsConfig);

export const getPromotions = async (stage: Stage): Promise<Promo[]> => {
	const tableName = `support-admin-console-promos-${stage}`;
	logger.log(`Scanning ${tableName}`);
	const result = await dynamoClient.send(
		new ScanCommand({ TableName: tableName }),
	);

	if (result.Items === undefined) {
		throw new ReferenceError(
			`We were unable to retrieve promotions from ${tableName}`,
		);
	}

	return result.Items.map((item) => {
		const unmarshalledItem = unmarshall(item);
		const parseResult = promoSchema.safeParse(unmarshalledItem);
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
