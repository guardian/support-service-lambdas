import type { z } from 'zod';
import type { productCatalogSchema } from '@modules/product-catalog/generatedSchema';

type ProductBillingSystem = 'stripe' | 'zuora';

type ProductCatalog = z.infer<typeof productCatalogSchema>;
// -------- Product --------
type ProductKey = keyof ProductCatalog;
type Product<P extends ProductKey> = ProductCatalog[P];

// -------- Product Rate Plan --------
type ProductRatePlanKey<P extends ProductKey> =
	keyof ProductCatalog[P]['ratePlans'];
type ProductRatePlan<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = ProductCatalog[P]['ratePlans'][PRP];

// We need to give Typescript some help here
// Define a type that represents the structure of rate plans
interface RatePlanStructure {
	id: string;
	charges: Record<string, { id: string }>;
}

// -------- Product Rate Plan Charge --------
export type ProductRatePlanChargeKey<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = keyof (ProductCatalog[P]['ratePlans'][PRP] & RatePlanStructure)['charges'];

export type ProductRatePlanCharge<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
	C extends ProductRatePlanChargeKey<P, PRP>,
> = (ProductCatalog[P]['ratePlans'][PRP] & RatePlanStructure)['charges'][C];

export const product = (product: Product<'GuardianAdLite'>) => {
	return product.active;
};

export const productRatePlan = (
	productRatePlan: ProductRatePlan<'OneTimeContribution', 'OneTime'>,
) => {
	return productRatePlan.charges.Contribution;
};
export const productRatePlanCharge = <
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
	C extends ProductRatePlanChargeKey<P, PRP>,
>(
	productRatePlanCharge: ProductRatePlanCharge<P, PRP, C>,
) => {
	return productRatePlanCharge.id;
};

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
