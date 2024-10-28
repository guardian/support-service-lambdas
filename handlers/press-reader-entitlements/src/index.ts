import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import {
	ProductCatalog,
	ProductCatalogHelper,
} from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { getSupporterProductData, SupporterRatePlanItem } from './dynamo';

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	return await Promise.resolve({
		body: 'Hello World!',
		statusCode: 200,
	});
};

async function checkEntitlements(
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

function checkForValidEntitlements(
	productCatalog: ProductCatalog,
	supporterProductData: SupporterRatePlanItem[],
) {
	const validProducts = ['DigitalSubscription', 'TierThree', 'GuardianWeekly'];

	const productCatalogHelper = new ProductCatalogHelper(productCatalog);

	const hasValidSubscription = !!supporterProductData.find((item) =>
		validProducts.includes(
			productCatalogHelper.findProductDetails(item.productRatePlanId)
				?.zuoraProduct ?? '',
		),
	);

	return hasValidSubscription;
}
