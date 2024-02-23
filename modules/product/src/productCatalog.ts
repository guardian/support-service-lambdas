import type { Catalog } from '@modules/catalog/catalogSchema';
import { generateProductCatalog } from './generateProductCatalog';
import type { typeObject } from './types/typeObject';

type ZuoraProductKey = keyof typeof typeObject;

type ProductRatePlanKey<ZP extends ZuoraProductKey> =
	keyof (typeof typeObject)[ZP]['productRatePlans'];

type ProductRatePlanChargeKey<
	ZP extends ZuoraProductKey,
	PRP extends ProductRatePlanKey<ZP>,
> = keyof (typeof typeObject)[ZP]['productRatePlans'][PRP];

type ProductCurrency<ZP extends ZuoraProductKey> =
	(typeof typeObject)[ZP]['currencies'][number];

type ProductPrice<ZP extends ZuoraProductKey> = {
	[PC in ProductCurrency<ZP>]: number;
};

export type ProductRatePlanCharge = {
	id: string;
};

type ProductRatePlan<
	ZP extends ZuoraProductKey,
	PRP extends ProductRatePlanKey<ZP>,
> = {
	id: string;
	pricing: ProductPrice<ZP>;
	charges: {
		[PRPC in ProductRatePlanChargeKey<ZP, PRP>]: ProductRatePlanCharge;
	};
};

type ZuoraProduct<ZP extends ZuoraProductKey> = {
	ratePlans: {
		[PRP in ProductRatePlanKey<ZP>]: ProductRatePlan<ZP, PRP>;
	};
};

export type ProductCatalog = {
	products: {
		[ZP in ZuoraProductKey]: ZuoraProduct<ZP>;
	};
};

export class ProductCatalogHelper {
	constructor(private catalogData: ProductCatalog) {}

	getProductRatePlan = <
		ZP extends ZuoraProductKey,
		PRP extends ProductRatePlanKey<ZP>,
	>(
		zuoraProduct: ZP,
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

export const getProductCatalogFromZuoraCatalog = (catalog: Catalog) => {
	const catalogData = generateProductCatalog(catalog);
	return new ProductCatalogHelper(catalogData);
};
