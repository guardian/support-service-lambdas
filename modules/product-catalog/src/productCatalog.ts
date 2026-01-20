import { isInList } from '@modules/arrayFunctions';
import { objectKeys, objectKeysNonEmpty } from '@modules/objectFunctions';
import { z } from 'zod';
import type { termTypeSchema } from '@modules/product-catalog/productCatalogSchema';
import { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';

type ProductBillingSystem = 'stripe' | 'zuora';

export type ProductCatalog = z.infer<typeof productCatalogSchema>;

// -------- Product --------
export type ProductKey = keyof ProductCatalog & string;
export const isProductKey = isInList(
	objectKeysNonEmpty(productCatalogSchema._def.shape()),
);

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

export const isDeliveryProduct = isInList(deliveryProducts);

export function isDeliveryProductPurchase(
	productPurchase: ProductPurchase,
): productPurchase is Extract<
	ProductPurchase,
	{ product: DeliveryProductKey }
> {
	return isDeliveryProduct(productPurchase.product);
}

// Products which do not support promotions
const promotionExcludedKeys = [
	'Contribution',
	'OneTimeContribution',
	'GuardianAdLite',
	'GuardianPatron',
] as const;

type PromotionExcludedKey = (typeof promotionExcludedKeys)[number];

export type PromotionSupportedProductKey = Exclude<
	ProductKey,
	PromotionExcludedKey
>;

export const supportsPromotions = (
	productKey: ProductKey,
): productKey is PromotionSupportedProductKey => {
	const promotionExcludedKeysSchema = z.enum(promotionExcludedKeys);
	return !promotionExcludedKeysSchema.safeParse(productKey).success;
};

// Eventually all but OneTimeContribution will come from a custom field in Zuora's Product Catalog
const customerFacingNameMapping: Record<ProductKey, string> = {
	GuardianAdLite: 'Guardian Ad-Lite',
	SupporterPlus: 'All-access digital',
	TierThree: 'Digital + print',
	DigitalSubscription: 'Digital plus',
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

export function getCustomerFacingName(productKey: ProductKey): string {
	return customerFacingNameMapping[productKey];
}

export type Product<P extends ProductKey> = ProductCatalog[P];

// -------- Product Rate Plan --------
export type ProductRatePlanKey<P extends ProductKey> =
	keyof ProductCatalog[P]['ratePlans'] & string;
export type ProductRatePlan<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = ProductCatalog[P]['ratePlans'][PRP];

export type TermType = z.infer<typeof termTypeSchema>;

export class ProductCatalogHelper {
	constructor(private catalogData: ProductCatalog) {
		// console.log(shouldCompile.toString()); // TODO delete, just to stop ts unused warnings
	}

	getProductRatePlan = <
		P extends ProductKey,
		PRP extends ProductRatePlanKey<P>,
	>(
		productKey: P,
		productRatePlanKey: PRP,
	): ProductRatePlan<P, PRP> => {
		const ratePlans: ProductCatalog[P]['ratePlans'] =
			this.catalogData[productKey].ratePlans;
		return ratePlans[productRatePlanKey];
	};

	getAllProductDetailsForBillingSystem = (
		billingSystem: ProductBillingSystem,
	) =>
		this.getAllProductDetails().filter(
			(productDetail) => productDetail.billingSystem === billingSystem,
		);

	getAllProductDetails = () => {
		const stageMapping = this.catalogData;
		const zuoraProductKeys = objectKeysNonEmpty(stageMapping);
		return zuoraProductKeys.flatMap((zuoraProduct) => {
			const billingSystem = stageMapping[zuoraProduct].billingSystem;
			const productRatePlans = stageMapping[zuoraProduct].ratePlans;
			// the type checker thinks the following is empty/never due to there being no intersection between all ratePlans
			const productRatePlanKeys = objectKeys(productRatePlans);
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
