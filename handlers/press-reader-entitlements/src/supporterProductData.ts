import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { sortBy } from '@modules/arrayFunctions';
import { awsConfig } from '@modules/aws/config';
import type {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';

const dynamoClient = new DynamoDBClient(awsConfig);

export type SupporterRatePlanItem = {
	subscriptionName: string; // Unique identifier for the subscription
	identityId: string; // Unique identifier for user
	productRatePlanId: string; // Unique identifier for the product in this rate plan
	productRatePlanName: string; // Name of the product in this rate plan
	termEndDate: string; // Date that this subscription term ends
	contractEffectiveDate: string; // Date that this subscription started
};

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
	return data.Items?.map((item) => unmarshall(item) as SupporterRatePlanItem);
};

export async function getLatestSubscription(
	stage: Stage,
	identityId: string,
	productCatalog: ProductCatalog,
): Promise<SupporterRatePlanItem | undefined> {
	const supporterProductDataItems = await getSupporterProductData(
		stage,
		identityId,
	);

	if (supporterProductDataItems) {
		return getLatestValidSubscription(
			productCatalog,
			supporterProductDataItems,
		);
	}

	return undefined;
}

export function getLatestValidSubscription(
	productCatalog: ProductCatalog,
	supporterProductData: SupporterRatePlanItem[],
): SupporterRatePlanItem | undefined {
	const validProducts: Array<ProductKey | undefined> = [
		'DigitalSubscription',
		'HomeDelivery',
		'NationalDelivery',
		'SubscriptionCard',
		'SupporterPlus',
		'TierThree',
		// ToDo: add Patron, currently not in product catalog
	] as const;

	const productCatalogHelper = new ProductCatalogHelper(productCatalog);

	const validSubscriptions = supporterProductData.filter((item) =>
		validProducts.includes(
			productCatalogHelper.findProductDetails(item.productRatePlanId)
				?.zuoraProduct,
		),
	);
	const latestSubscription = sortBy(
		validSubscriptions,
		(item) => item.termEndDate,
	).pop();
	console.log(
		`User has ${validSubscriptions.length} valid subscriptions, returning latest: ${JSON.stringify(latestSubscription)}`,
	);
	return latestSubscription;
}
