import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';

export function getExcludedProductRatePlanIds(
	zuoraCatalog: ZuoraCatalog,
): string[] {
	const discountProductRatePlanIds =
		getDiscountProductRatePlanIds(zuoraCatalog);
	const sixForSixProductRatePlanIds =
		getSixForSixProductRatePlanIds(zuoraCatalog);
	return [...discountProductRatePlanIds, ...sixForSixProductRatePlanIds];
}

function getDiscountProductRatePlanIds(zuoraCatalog: ZuoraCatalog): string[] {
	const discountProduct = zuoraCatalog.products.find(
		(product) => product.name === 'Discounts',
	);
	if (!discountProduct) {
		throw new Error('Discounts product not found in catalog');
	}
	return discountProduct.productRatePlans.map((plan) => plan.id);
}

function getSixForSixProductRatePlanIds(zuoraCatalog: ZuoraCatalog): string[] {
	const guardianWeeklyProducts = zuoraCatalog.products.filter((product) =>
		product.name.startsWith('Guardian Weekly'),
	);
	const numberOfGuardianWeeklyProductsInZuoraCatalog = 5; // The current Domestic & ROW plus three old Zone based ones
	if (
		guardianWeeklyProducts.length !==
		numberOfGuardianWeeklyProductsInZuoraCatalog
	) {
		throw new Error(
			`Only ${guardianWeeklyProducts.length} Guardian Weekly products found in catalog`,
		);
	}
	return guardianWeeklyProducts.flatMap((product) =>
		product.productRatePlans
			.filter((plan) => plan.FrontendId__c === 'SixWeeks')
			.map((plan) => plan.id),
	);
}
export function isExcludedProductRatePlanItem(
	excludedIds: string[],
	item: SupporterRatePlanItem,
): boolean {
	return excludedIds.includes(item.productRatePlanId);
}
