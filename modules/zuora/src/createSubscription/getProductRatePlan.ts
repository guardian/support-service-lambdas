import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';

export function getProductRatePlan(
	productCatalog: ProductCatalog,
	productPurchase: ProductPurchase,
) {
	const productCatalogHelper = new ProductCatalogHelper(productCatalog);

	// Use a switch statement to narrow each variant of the discriminated union
	// This is the only way I can find to convince TypeScript that the
	// product and ratePlan combination is valid
	switch (productPurchase.product) {
		case 'Contribution':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'GuardianWeeklyRestOfWorld':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'GuardianAdLite':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'TierThree':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'DigitalSubscription':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'NationalDelivery':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'SupporterMembership':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'SupporterPlus':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'GuardianWeeklyDomestic':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'SubscriptionCard':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'GuardianWeeklyZoneA':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'GuardianWeeklyZoneB':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'GuardianWeeklyZoneC':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'NewspaperVoucher':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'HomeDelivery':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'PatronMembership':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		case 'PartnerMembership':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			);
		default:
			throw new Error(`Unhandled product: ${JSON.stringify(productPurchase)}`);
	}
}
