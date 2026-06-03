import { sortBy } from '@modules/arrayFunctions';
import { productBenefitMapping } from '@modules/product-benefits/productBenefit';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { getSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';

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

function isValidSubscription(
	productCatalogHelper: ProductCatalogHelper,
	supporterRatePlanItem: SupporterRatePlanItem,
) {
	const productKey = productCatalogHelper.findProductDetails(
		supporterRatePlanItem.productRatePlanId,
	)?.zuoraProduct;
	return (
		productKey && productBenefitMapping[productKey].includes('newspaperEdition')
	);
}

export function getLatestValidSubscription(
	productCatalog: ProductCatalog,
	supporterProductData: SupporterRatePlanItem[],
): SupporterRatePlanItem | undefined {
	const productCatalogHelper = new ProductCatalogHelper(productCatalog);

	const validSubscriptions = supporterProductData.filter((item) =>
		isValidSubscription(productCatalogHelper, item),
	);
	const latestSubscription = sortBy(validSubscriptions, (item) =>
		zuoraDateFormat(item.termEndDate),
	).reverse()[0];
	console.log(
		`User has ${validSubscriptions.length} valid subscriptions, returning latest: ${JSON.stringify(latestSubscription)}`,
	);
	return latestSubscription;
}
