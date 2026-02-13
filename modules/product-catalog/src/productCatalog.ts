import { isInList } from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import { objectEntries, objectKeysNonEmpty } from '@modules/objectFunctions';
import { z } from 'zod';
import type { termTypeSchema } from '@modules/product-catalog/productCatalogSchema';
import { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';

type ProductBillingSystem = 'stripe' | 'zuora';

export type ProductCatalog = z.infer<typeof productCatalogSchema>;

// -------- Product --------
export type ProductKey = keyof ProductCatalog;
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
export type ProductRatePlanKey<P extends ProductKey> = P extends unknown
	? keyof ProductCatalog[P]['ratePlans'] & string
	: never;
export type ProductRatePlan<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = P extends ProductKey
	? PRP extends keyof ProductCatalog[P]['ratePlans']
		? ProductCatalog[P]['ratePlans'][PRP]
		: never
	: never;

export type ProductRatePlanChargeKey<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = {
	[PK in P]: {
		[K in ProductRatePlanKey<PK> &
			PRP]: ProductCatalog[PK]['ratePlans'][K] extends { charges: infer C }
			? keyof C & string
			: never;
	}[ProductRatePlanKey<PK> & PRP];
}[P];

export type TermType = z.infer<typeof termTypeSchema>;

export type GuardianCatalogKeys<
	P extends ProductKey = ProductKey,
	PRP extends ProductRatePlanKey<P> = ProductRatePlanKey<P>,
> = P extends ProductKey
	? {
			[RPK in PRP & ProductRatePlanKey<P>]: {
				productKey: P;
				productRatePlanKey: RPK;
			};
		}[PRP & ProductRatePlanKey<P>]
	: never;

export class ProductCatalogHelper {
	constructor(private catalogData: ProductCatalog) {}

	getProductRatePlan = <
		P extends ProductKey,
		PRP extends ProductRatePlanKey<P>,
	>(
		productKey: P,
		productRatePlanKey: PRP,
	): ProductRatePlan<P, PRP> => {
		const ratePlans: ProductCatalog[P]['ratePlans'] =
			this.catalogData[productKey].ratePlans;
		return ratePlans[productRatePlanKey] as ProductRatePlan<P, PRP>;
	};

	getAllProductDetailsForBillingSystem = (
		billingSystem: ProductBillingSystem,
	) =>
		this.getAllProductDetails().filter(
			(productDetail) => productDetail.billingSystem === billingSystem,
		);

	getAllProductDetails = () =>
		objectEntries(this.catalogData).flatMap(
			<P extends ProductKey>([productKey, product]: [P, Product<P>]) =>
				objectEntries(product.ratePlans).flatMap(
					([productRatePlanKey, productRatePlan]: [
						ProductRatePlanKey<P>,
						ProductRatePlan<P, ProductRatePlanKey<P>>,
					]) => ({
						zuoraProduct: productKey,
						billingSystem: product.billingSystem,
						productRatePlan: productRatePlanKey,
						id: productRatePlan.id,
					}),
				),
		);

	findProductDetails = (productRatePlanId: string) => {
		const allProducts = this.getAllProductDetails();
		return allProducts.find((product) => product.id === productRatePlanId);
	};

	/**
	 * validates the rate plan key against the product and returns the combined object
	 * or undefined
	 */
	validate<P extends ProductKey>(
		targetGuardianProductName: P,
		productRatePlanKey: string,
	): GuardianCatalogKeys<P> | undefined {
		const ratePlans = this.catalogData[targetGuardianProductName].ratePlans;
		if (!this.hasRatePlan(productRatePlanKey, ratePlans)) {
			return undefined;
		}

		return {
			productKey: targetGuardianProductName,
			productRatePlanKey: productRatePlanKey as ProductRatePlanKey<P>,
		} as GuardianCatalogKeys<P>;
	}

	/**
	 * validates the rate plan key against the product and returns the combined object or
	 * throws an error
	 */
	validateOrThrow<P extends ProductKey>(
		targetGuardianProductName: P,
		productRatePlanKey: string,
	): GuardianCatalogKeys<P> {
		return getIfDefined(
			this.validate(targetGuardianProductName, productRatePlanKey),

			`Unsupported rate plan key: ${String(
				productRatePlanKey,
			)} for product ${targetGuardianProductName}`,
		);
	}

	private hasRatePlan<P extends ProductKey>(
		productRatePlanKey: string,
		ratePlans: ProductCatalog[P]['ratePlans'],
	): productRatePlanKey is ProductRatePlanKey<P> {
		return productRatePlanKey in ratePlans;
	}
}
