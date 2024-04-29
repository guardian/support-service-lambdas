import type { BillingPeriod } from '@modules/billingPeriod';
import type { typeObject } from '@modules/product-catalog/typeObject';

type TypeObject = typeof typeObject;

type ProductKey = keyof TypeObject;

type ProductRatePlanKey<P extends ProductKey> =
	keyof TypeObject[P]['productRatePlans'];

type ProductRatePlanChargeKey<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = keyof TypeObject[P]['productRatePlans'][PRP];

type ProductCurrency<P extends ProductKey> =
	TypeObject[P]['currencies'][number];

type ProductPrice<P extends ProductKey> = {
	[PC in ProductCurrency<P>]: number;
};

export type ProductRatePlanCharge = {
	id: string;
};

type ProductRatePlan<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = {
	id: string;
	pricing: ProductPrice<P>;
	charges: {
		[PRPC in ProductRatePlanChargeKey<P, PRP>]: ProductRatePlanCharge;
	};
	billingPeriod?: BillingPeriod;
};

type Product<P extends ProductKey> = {
	ratePlans: {
		[PRP in ProductRatePlanKey<P>]: ProductRatePlan<P, PRP>;
	};
};

export type ProductCatalog = {
	[P in ProductKey]: Product<P>;
};

export class ProductCatalogHelper {
	constructor(private catalogData: ProductCatalog) { }

	getProductRatePlan = <
		P extends ProductKey,
		PRP extends ProductRatePlanKey<P>,
	>(
		zuoraProduct: P,
		productRatePlan: PRP,
	) => {
		return this.catalogData[zuoraProduct].ratePlans[productRatePlan];
	};
	getAllProductDetails = () => {
		const stageMapping = this.catalogData;
		const zuoraProductKeys = Object.keys(stageMapping) as Array<
			keyof typeof stageMapping
		>;
		return zuoraProductKeys.flatMap((zuoraProduct) => {
			const productRatePlans = stageMapping[zuoraProduct].ratePlans;
			const productRatePlanKeys = Object.keys(productRatePlans) as Array<
				keyof typeof productRatePlans
			>;
			return productRatePlanKeys.flatMap((productRatePlan) => {
				const { id } = this.getProductRatePlan(zuoraProduct, productRatePlan);
				return {
					zuoraProduct,
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
