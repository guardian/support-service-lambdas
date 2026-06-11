import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';

export function getDiscountProductRatePlanIds(
	zuoraCatalog: ZuoraCatalog,
): string[] {
	const discountProduct = zuoraCatalog.products.find(
		(product) => product.name === 'Discounts',
	);
	if (!discountProduct) {
		throw new Error('Discounts product not found in catalog');
	}
	return discountProduct.productRatePlans.map((plan) => plan.id);
}

export function isDiscountProductRatePlanItem(
	discountIds: string[],
	item: SupporterRatePlanItem,
): boolean {
	return discountIds.includes(item.productRatePlanId);
}
