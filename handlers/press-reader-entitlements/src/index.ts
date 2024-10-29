import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import type { SupporterRatePlanItem } from './dynamo';
import { getSupporterProductData } from './dynamo';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	return await Promise.resolve({
		body: 'Hello World!',
		statusCode: 200,
	});
};

export async function checkEntitlements(
	identityId: string,
	stage: Stage,
): Promise<boolean> {
	const supporterProductData = await getSupporterProductData(identityId, stage);

	if (supporterProductData) {
		const productCatalog = await getProductCatalogFromApi(stage);

		return checkForValidEntitlements(productCatalog, supporterProductData);
	}

	return false;
}

export function checkForValidEntitlements(
	productCatalog: ProductCatalog,
	supporterProductData: SupporterRatePlanItem[],
) {
	// ToDo: complete list of valid products
	const validProducts: Array<ProductKey | undefined> = [
		'DigitalSubscription',
		'TierThree',
		'GuardianWeeklyDomestic',
	];

	const productCatalogHelper = new ProductCatalogHelper(productCatalog);

	const hasValidSubscription = !!supporterProductData.find((item) =>
		validProducts.includes(
			productCatalogHelper.findProductDetails(item.productRatePlanId)
				?.zuoraProduct,
		),
	);

	return hasValidSubscription;
}
