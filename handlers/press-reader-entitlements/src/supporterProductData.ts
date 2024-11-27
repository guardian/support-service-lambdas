import { sortBy } from '@modules/arrayFunctions';
import type {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { getSupporterProductData } from '@modules/supporter-product-data/supporterProductData';

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
		'NewspaperVoucher',
		'SupporterPlus',
		'TierThree',
		'GuardianPatron',
		'PatronMembership',
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
