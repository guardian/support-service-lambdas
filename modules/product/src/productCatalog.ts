import type { typeObject } from '@modules/product/typeObject';

type ProductKey = keyof typeof typeObject;

type ProductRatePlanKey<P extends ProductKey> =
	keyof (typeof typeObject)[P]['productRatePlans'];

type ProductRatePlanChargeKey<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = keyof (typeof typeObject)[P]['productRatePlans'][PRP];

type ProductCurrency<P extends ProductKey> =
	(typeof typeObject)[P]['currencies'][number];

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
};

type ZuoraProduct<P extends ProductKey> = {
	ratePlans: {
		[PRP in ProductRatePlanKey<P>]: ProductRatePlan<P, PRP>;
	};
};

export type ProductCatalog = {
	products: {
		[P in ProductKey]: ZuoraProduct<P>;
	};
};

export class ProductCatalogHelper {
	constructor(private catalogData: ProductCatalog) {}

	getProductRatePlan = <
		P extends ProductKey,
		PRP extends ProductRatePlanKey<P>,
	>(
		zuoraProduct: P,
		productRatePlan: PRP,
	) => {
		return this.catalogData.products[zuoraProduct].ratePlans[productRatePlan];
	};
	getAllProductDetails = () => {
		const stageMapping = this.catalogData.products;
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
