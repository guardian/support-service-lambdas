import type { Stage } from '@modules/stage';
import codeMapping from './codeCatalogMapping.json';
import type { mappingTypes } from './mappingTypes';
import prodMapping from './prodCatalogMapping.json';

const mappingsForStage = (stage: Stage) =>
	stage === 'CODE'
		? (codeMapping as MappedCatalog)
		: (prodMapping as MappedCatalog);

type ZuoraProductKey = keyof typeof mappingTypes;

type ProductRatePlanKey<ZP extends ZuoraProductKey> =
	keyof (typeof mappingTypes)[ZP]['productRatePlans'];

type ProductRatePlanChargeKey<
	ZP extends ZuoraProductKey,
	PRP extends ProductRatePlanKey<ZP>,
> = keyof (typeof mappingTypes)[ZP]['productRatePlans'][PRP];

type ProductCurrency<ZP extends ZuoraProductKey> =
	(typeof mappingTypes)[ZP]['currencies'][number];

type ProductPrice<ZP extends ZuoraProductKey> = {
	[PC in ProductCurrency<ZP>]: number;
};

export type ProductRatePlanCharge<ZP extends ZuoraProductKey> = {
	id: string;
	pricing: ProductPrice<ZP>;
};

type ProductRatePlan<
	ZP extends ZuoraProductKey,
	PRP extends ProductRatePlanKey<ZP>,
> = {
	id: string;
	charges: {
		[PRPC in ProductRatePlanChargeKey<ZP, PRP>]: ProductRatePlanCharge<ZP>;
	};
};

type ZuoraProduct<ZP extends ZuoraProductKey> = {
	ratePlans: {
		[PRP in ProductRatePlanKey<ZP>]: ProductRatePlan<ZP, PRP>;
	};
};

type MappedCatalog = {
	products: {
		[ZP in ZuoraProductKey]: ZuoraProduct<ZP>;
	};
};

export const getProductRatePlan = <
	ZP extends ZuoraProductKey,
	PRP extends ProductRatePlanKey<ZP>,
>(
	stage: Stage,
	zuoraProduct: ZP,
	productRatePlan: PRP,
) => {
	const products = mappingsForStage(stage).products;
	const product = products[zuoraProduct];
	return product.ratePlans[productRatePlan];
};

export const getAllProductDetails = (stage: Stage) => {
	const stageMapping = mappingsForStage(stage).products;
	const zuoraProductKeys = Object.keys(stageMapping) as Array<
		keyof typeof stageMapping
	>;
	return zuoraProductKeys.flatMap((zuoraProduct) => {
		const productRatePlans = stageMapping[zuoraProduct].ratePlans;
		const productRatePlanKeys = Object.keys(productRatePlans) as Array<
			keyof typeof productRatePlans
		>;
		return productRatePlanKeys.flatMap((productRatePlan) => {
			const { id } = getProductRatePlan(stage, zuoraProduct, productRatePlan);
			return {
				zuoraProduct,
				productRatePlan,
				id,
			};
		});
	});
};
export const findProductDetails = (stage: Stage, productRatePlanId: string) => {
	const allProducts = getAllProductDetails(stage);
	return allProducts.find((product) => product.id === productRatePlanId);
};
