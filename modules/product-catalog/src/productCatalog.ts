import type { z } from 'zod';
import type { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';

type ProductBillingSystem = 'stripe' | 'zuora';

export type ProductCatalog = z.infer<typeof productCatalogSchema>;

// -------- Product --------
export type ProductKey = keyof ProductCatalog;

export type ZuoraProductKey = {
	[K in ProductKey]: ProductCatalog[K]['billingSystem'] extends 'zuora'
		? K
		: never;
}[ProductKey];

export const newspaperProducts = [
	'HomeDelivery',
	'NationalDelivery',
	'SubscriptionCard',
	'NewspaperVoucher',
] as const;
export const deliveryProducts = [
	...newspaperProducts,
	'TierThree',
	'GuardianWeeklyRestOfWorld',
	'GuardianWeeklyDomestic',
	'GuardianWeeklyZoneA',
	'GuardianWeeklyZoneB',
	'GuardianWeeklyZoneC',
] as const;

export function requiresDeliveryInstructions(productKey: unknown): boolean {
	return productKey === 'HomeDelivery' || productKey === 'NationalDelivery';
}

export type DeliveryProductKey = (typeof deliveryProducts)[number];

export function isDeliveryProduct(
	productKey: unknown,
): productKey is DeliveryProductKey {
	return deliveryProducts.includes(productKey as DeliveryProductKey);
}

export function isDeliveryProductPurchase(
	productPurchase: ProductPurchase,
): productPurchase is Extract<
	ProductPurchase,
	{ product: DeliveryProductKey }
> {
	return isDeliveryProduct(productPurchase.product);

// Eventually all but OneTimeContribution will come from a custom field in Zuora's Product Catalog
const customerFacingNameMapping: Record<ProductKey, string> = {
	GuardianAdLite: 'Guardian Ad-Lite',
	SupporterPlus: 'All-access digital',
	TierThree: 'Digital + print',
	DigitalSubscription: 'The Guardian Digital Edition',
	HomeDelivery: 'Newspaper Home Delivery',
	NationalDelivery: 'Newspaper Home Delivery',
	NewspaperVoucher: 'Newspaper Voucher',
	SubscriptionCard: 'Newspaper Subscription Card',
	SupporterMembership: 'Supporter Membership',
	PartnerMembership: 'Partner Membership',
	PatronMembership: 'Patron Membership',
	GuardianPatron: 'Guardian Patron',
	GuardianWeeklyDomestic: 'Guardian Weekly',
	GuardianWeeklyRestOfWorld: 'Guardian Weekly',
	GuardianWeeklyZoneA: 'Guardian Weekly',
	GuardianWeeklyZoneB: 'Guardian Weekly',
	GuardianWeeklyZoneC: 'Guardian Weekly',
	Contribution: 'Support',
	OneTimeContribution: 'Support just once',
};

export function getCustomerFacingName(productKey: unknown): string {
	return customerFacingNameMapping[productKey as ProductKey];
}

export type Product<P extends ProductKey> = ProductCatalog[P];

// -------- Product Rate Plan --------
export type ProductRatePlanKey<P extends ProductKey> =
	keyof ProductCatalog[P]['ratePlans'];
export type ProductRatePlan<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = ProductCatalog[P]['ratePlans'][PRP];

export type ZuoraProductRatePlanKey<P extends ZuoraProductKey> =
	keyof ProductCatalog[P]['ratePlans'];

export class ProductCatalogHelper {
	constructor(private catalogData: ProductCatalog) {}

	getProductRatePlan = <
		P extends ProductKey,
		PRP extends ProductRatePlanKey<P>,
	>(
		productKey: P,
		productRatePlanKey: PRP,
	): ProductRatePlan<P, PRP> => {
		const product: Product<P> = this.catalogData[productKey];
		if (productRatePlanKey in product.ratePlans) {
			// Use type assertion to help TypeScript understand this is safe
			return product.ratePlans[
				productRatePlanKey as keyof typeof product.ratePlans
			] as ProductRatePlan<P, PRP>;
		}
		throw new Error(
			'Product rate plan not found, this should never happen if the types system works',
		);
	};
	getAllProductDetailsForBillingSystem = (
		billingSystem: ProductBillingSystem,
	) =>
		this.getAllProductDetails().filter(
			(productDetail) => productDetail.billingSystem === billingSystem,
		);

	getAllProductDetails = () => {
		const stageMapping = this.catalogData;
		const zuoraProductKeys = Object.keys(stageMapping) as Array<
			keyof typeof stageMapping
		>;
		return zuoraProductKeys.flatMap((zuoraProduct) => {
			const billingSystem = stageMapping[zuoraProduct].billingSystem;
			const productRatePlans = stageMapping[zuoraProduct].ratePlans;
			const productRatePlanKeys = Object.keys(productRatePlans) as Array<
				keyof typeof productRatePlans
			>;
			return productRatePlanKeys.flatMap((productRatePlan) => {
				const { id } = this.getProductRatePlan(zuoraProduct, productRatePlan);
				return {
					zuoraProduct,
					billingSystem,
					productRatePlan,
					id,
				};
			});
		});
	};
	findProductDetails = (productRatePlanId: string) => {
		const allProducts = this.getAllProductDetails();
		return allProducts.find((product) => product.id === productRatePlanId);
	};
}
