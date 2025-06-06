import type { z } from 'zod';
import type { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';

type ProductBillingSystem = 'stripe' | 'zuora';

export type ProductCatalog = z.infer<typeof productCatalogSchema>;

// -------- Product --------
export type ProductKey = keyof ProductCatalog;
export type Product<P extends ProductKey> = ProductCatalog[P];

// -------- Product Rate Plan --------
export type ProductRatePlanKey<P extends ProductKey> =
	keyof ProductCatalog[P]['ratePlans'];
export type ProductRatePlan<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = ProductCatalog[P]['ratePlans'][PRP];

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
