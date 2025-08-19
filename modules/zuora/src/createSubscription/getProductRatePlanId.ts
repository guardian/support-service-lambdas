import {
	ProductCatalog,
	ProductCatalogHelper,
} from '@modules/product-catalog/productCatalog';
import { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';

export function getProductRatePlanId(
	productCatalog: ProductCatalog,
	productPurchase: ProductPurchase,
): string {
	const productCatalogHelper = new ProductCatalogHelper(productCatalog);

	// Use a switch statement to narrow each variant of the discriminated union
	// This is the only way I can find to convince TypeScript that the
	// product and ratePlan combination is valid
	switch (productPurchase.product) {
		case 'Contribution':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'GuardianWeeklyRestOfWorld':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'GuardianAdLite':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'TierThree':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'DigitalSubscription':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'NationalDelivery':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'SupporterMembership':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'SupporterPlus':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'GuardianWeeklyDomestic':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'SubscriptionCard':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'GuardianWeeklyZoneA':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'GuardianWeeklyZoneB':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'GuardianWeeklyZoneC':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'NewspaperVoucher':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'HomeDelivery':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'PatronMembership':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		case 'PartnerMembership':
			return productCatalogHelper.getProductRatePlan(
				productPurchase.product,
				productPurchase.ratePlan,
			).id;
		default:
			throw new Error(`Unhandled product: ${JSON.stringify(productPurchase)}`);
	}
}
