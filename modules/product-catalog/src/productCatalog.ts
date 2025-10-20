import type { z } from 'zod';
import type {
	productCatalogSchema,
	termTypeSchema,
} from '@modules/product-catalog/productCatalogSchema';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { zuoraCatalogToProductKey } from "@modules/product-catalog/zuoraToProductNameMappings";

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
}

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

export function getZuoraCatalogName(productKey: unknown): string {
    return Object.entries(zuoraCatalogToProductKey).find(
        ([_, value]) => value === productKey
    )?.[0] || '**Not in Zuora**';
}

const termsAndConditionsNameMapping: Record<ProductKey, string> = {
    GuardianAdLite: 'Guardian Ad-Lite',
    SupporterPlus: 'The Guardian Supporter Plus',
    TierThree: 'Digital + print',
    DigitalSubscription: 'The Guardian Digital subscription',
    HomeDelivery: 'Subscription card, home delivery and voucher subscription',
    NationalDelivery: 'Newspaper - National Delivery',
    NewspaperVoucher: 'Newspaper Voucher',
    SubscriptionCard: 'Newspaper Digital Voucher',
    SupporterMembership: 'Guardian Members',
    PartnerMembership: 'Guardian Members',
    PatronMembership: 'Guardian Members',
    GuardianWeeklyDomestic: 'Guardian Weekly print subscription services',
    GuardianWeeklyRestOfWorld: 'Guardian Weekly print subscription services',
    GuardianWeeklyZoneA: 'Guardian Weekly print subscription services',
    GuardianWeeklyZoneB: 'Guardian Weekly print subscription services',
    GuardianWeeklyZoneC: 'Guardian Weekly print subscription services',
    Contribution: 'Contribution',
    OneTimeContribution: 'Contribution',
    GuardianPatron: 'Guardian Patrons',
};

export function getTermsAndConditionsName(productKey: unknown): string {
    return termsAndConditionsNameMapping[productKey as ProductKey];
}

const termsAndConditionsURLMapping: Record<ProductKey, string> = {
    GuardianAdLite: 'https://www.theguardian.com/info/2025/mar/06/terms-and-conditions-for-guardian-ad-lite',
    SupporterPlus: 'https://www.theguardian.com/info/2022/oct/28/the-guardian-supporter-plus-terms-and-conditions',
    TierThree: 'https://www.theguardian.com/info/2024/jul/19/digital-print-terms-and-conditions',
    DigitalSubscription: 'https://www.theguardian.com/info/2014/aug/06/guardian-observer-digital-subscriptions-terms-conditions',
    HomeDelivery: 'https://www.theguardian.com/info/2021/aug/04/guardian-and-observer-voucher-subscription-card-and-home-delivery-subscription-services-terms-and-conditions',
    NationalDelivery: 'https://www.theguardian.com/info/2021/aug/04/guardian-and-observer-voucher-subscription-card-and-home-delivery-subscription-services-terms-and-conditions',
    NewspaperVoucher: 'https://www.theguardian.com/info/2021/aug/04/guardian-and-observer-voucher-subscription-card-and-home-delivery-subscription-services-terms-and-conditions',
    SubscriptionCard: 'https://www.theguardian.com/info/2021/aug/04/guardian-and-observer-voucher-subscription-card-and-home-delivery-subscription-services-terms-and-conditions',
    SupporterMembership: 'https://www.theguardian.com/info/2016/nov/08/guardian-members-international-terms-and-conditions',
    PartnerMembership: 'https://www.theguardian.com/info/2016/nov/08/guardian-members-international-terms-and-conditions',
    PatronMembership: 'https://www.theguardian.com/info/2016/nov/08/guardian-members-international-terms-and-conditions',
    GuardianWeeklyDomestic: 'https://www.theguardian.com/info/2014/jul/10/guardian-weekly-print-subscription-services-terms-conditions',
    GuardianWeeklyRestOfWorld: 'https://www.theguardian.com/info/2014/jul/10/guardian-weekly-print-subscription-services-terms-conditions',
    GuardianWeeklyZoneA: 'https://www.theguardian.com/info/2014/jul/10/guardian-weekly-print-subscription-services-terms-conditions',
    GuardianWeeklyZoneB: 'https://www.theguardian.com/info/2014/jul/10/guardian-weekly-print-subscription-services-terms-conditions',
    GuardianWeeklyZoneC: 'https://www.theguardian.com/info/2014/jul/10/guardian-weekly-print-subscription-services-terms-conditions',
    Contribution: 'https://www.theguardian.com/info/2016/apr/04/contribution-terms-and-condition',
    OneTimeContribution: 'https://www.theguardian.com/info/2016/apr/04/contribution-terms-and-condition',
    GuardianPatron: 'https://patrons.theguardian.com/terms-and-conditions',
};

export function getTermsAndConditionsURL(productKey: unknown): string {
    return termsAndConditionsURLMapping[productKey as ProductKey];
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

export type TermType = z.infer<typeof termTypeSchema>;

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
