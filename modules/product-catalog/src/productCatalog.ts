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

// --- UTIL ---
type AllKeys<U> = U extends any ? keyof U : never;
type RequiredKeys<U> = {
	[K in AllKeys<U>]: [U] extends [Record<K, unknown>] ? K : never;
}[AllKeys<U>];
type OptionalKeys<U> = Exclude<AllKeys<U>, RequiredKeys<U>>;
type RequiredProps<U> = {
	[K in RequiredKeys<U>]: Extract<U, Record<K, any>>[K];
};
type OptionalProps<U> = {
	[K in OptionalKeys<U>]?: Extract<U, Record<K, any>>[K];
};
type CommonPropsWithOptional<U> = RequiredProps<U> & OptionalProps<U>;

// --- charge ---
// type ChargesOfRatePlan<X> = X extends {
// 	charges: infer C extends Record<string, object>;
// }
// 	? C[keyof C]
// 	: never;
//
// type CommonRatePlanChargeFor<X> = CommonPropsWithOptional<
// 	ChargesOfRatePlan<X>
// >;

// must be called with a specific product, not a union
type RatePlansOfProduct<P extends ProductKey> =
	ProductCatalog[P]['ratePlans'][keyof ProductCatalog[P]['ratePlans']];

// type CommonRatePlanChargeForEachRatePlanOfProduct<P extends ProductKey> =
// 	CommonRatePlanChargeFor<RatePlansOfProduct<P>>;
//
// type CommonRatePlanChargeForProduct<P extends ProductKey> =
// 	CommonPropsWithOptional<CommonRatePlanChargeForEachRatePlanOfProduct<P>>;
//
// type AnyCommonProductCharge = {
// 	[P in ProductKey]: CommonRatePlanChargeForProduct<P>;
// }[ProductKey];
//
// export type CommonRatePlanCharge =
// 	CommonPropsWithOptional<AnyCommonProductCharge>;

// --- rate plan ---
type CommonRatePlanForProductBeforeCharges<P extends ProductKey> =
	CommonPropsWithOptional<RatePlansOfProduct<P>>;

type ChargesOfCommonRatePlan<P extends ProductKey> =
	CommonRatePlanForProductBeforeCharges<P> extends { charges: infer C }
		? C
		: never;

export type CommonRatePlanForProduct<P extends ProductKey> = Omit<
	CommonRatePlanForProductBeforeCharges<P>,
	'charges'
> & {
	charges: CommonPropsWithOptional<ChargesOfCommonRatePlan<P>>;
};

type AnyCommonProductRatePlan = {
	[P in ProductKey]: CommonRatePlanForProduct<P>;
}[ProductKey];

type CommonRatePlanBeforeCharges =
	CommonPropsWithOptional<AnyCommonProductRatePlan>;

export type CommonRatePlan = Omit<CommonRatePlanBeforeCharges, 'charges'> & {
	charges: CommonPropsWithOptional<
		{
			[P in ProductKey]: ChargesOfCommonRatePlan<P>;
		}[ProductKey]
	>;
};
// --- product ---
// type CommonProductForEachProduct<P extends ProductKey> = ProductCatalog[P];
//
// type CommonProductBeforeRatePlans = CommonPropsWithOptional<
// 	CommonProductForEachProduct<ProductKey>
// >;
//
// type RatePlansOfProductCatalog<P extends ProductKey> =
// 	ProductCatalog[P] extends { ratePlans: infer R } ? R : never;
//
// type DeUnionedChargesProp<CommonRP> = {
// 	charges: CommonPropsWithOptional<
// 		CommonRP extends { charges: infer C } ? C : never
// 	>;
// };
//
// // if it has a charges property, replace with a common props-ified version
// type ProcessChargesForRatePlan<CommonRP> = CommonRP extends { charges: any }
// 	? Omit<CommonRP, 'charges'> & DeUnionedChargesProp<CommonRP>
// 	: CommonRP;
//
// type CommonProductRatePlanKeys = CommonPropsWithOptional<
// 	{
// 		[P in ProductKey]: RatePlansOfProductCatalog<P>;
// 	}[ProductKey]
// >;
//
// // this de-unions all the products, and also replaces both ratePlans and charges with the relevant de-unioned versions
// export type CommonProduct = Omit<CommonProductBeforeRatePlans, 'ratePlans'> & {
// 	ratePlans: {
// 		[K in keyof CommonProductRatePlanKeys]: CommonPropsWithOptional<
// 			{
// 				[P in ProductKey]: RatePlansOfProductCatalog<P> extends Record<
// 					K,
// 					infer RP
// 				>
// 					? RP
// 					: never;
// 			}[ProductKey]
// 		> extends infer CommonRP
// 			? ProcessChargesForRatePlan<CommonRP>
// 			: never;
// 	};
// };
// // export type CommonRatePlan = CommonProduct extends {
// // 	ratePlans: infer RP;
// // }
// // 	? RP extends Record<string, infer RatePlan>
// // 		? RatePlan
// // 		: never
// // 	: never;
//
// // --- end ---
// function shouldCompile(
// 	a: CommonRatePlanChargeFor<ProductRatePlan<'DigitalSubscription', 'Annual'>>,
// 	b: CommonRatePlanChargeForProduct<'DigitalSubscription'>,
// 	c: CommonRatePlanCharge,
// 	d: CommonRatePlanForProduct<'HomeDelivery'>,
// 	e: CommonRatePlan,
// 	f: CommonProduct,
// ) {
// 	return [
// 		a.id,
// 		b.id,
// 		c.id,
// 		d.termType,
// 		d.charges.Monday?.id ?? '',
// 		e.termType,
// 		e.charges.Monday?.id ?? '',
// 		f.billingSystem,
// 		f.ratePlans.Monthly?.charges.Subscription?.id,
// 	];
// }

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
