import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { awsConfig } from '@modules/aws/config';
import type {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import { supportsPromotions } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { Promo } from '@modules/promotions/v2/schema';
import { promoSchema } from '@modules/promotions/v2/schema';

const dynamoClient = new DynamoDBClient(awsConfig);

export const getPromotion = async (
	promoCode: string,
	stage: Stage,
): Promise<Promo> => {
	const tableName = `support-admin-console-promos-${stage}`;
	console.log(`Querying ${tableName}`);
	const result = await dynamoClient.send(
		new GetItemCommand({
			TableName: tableName,
			Key: { promoCode: { S: promoCode } },
		}),
	);

	if (result.Item === undefined) {
		throw new ReferenceError(
			`We were unable to retrieve promotions from ${tableName}`,
		);
	}

	const unmarshalledItem = unmarshall(result.Item);
	const parseResult = promoSchema.safeParse(unmarshalledItem);

	if (!parseResult.success) {
		console.error(
			`Failed to parse promotion: ${JSON.stringify(result.Item, null, 2)} because of error:`,
			parseResult.error,
		);
		throw new Error('Failed to parse promotion');
	}
	return parseResult.data;
};

export const getDiscountRatePlanFromCatalog = (
	productCatalog: ProductCatalog,
	productKey: ProductKey,
) => {
	if (supportsPromotions(productKey)) {
		return productCatalog[productKey].ratePlans.Discount;
	}
	return;
};
