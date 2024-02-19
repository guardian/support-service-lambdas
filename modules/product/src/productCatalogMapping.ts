import type { Stage } from '@modules/stage';
import codeMapping from './codeCatalogMapping.json';
import prodMapping from './prodCatalogMapping.json';
import type prodTypes from './prodTypes.json';

const mappingsForStage = (stage: Stage) =>
	stage === 'CODE'
		? (codeMapping as MappedCatalog)
		: (prodMapping as MappedCatalog);

type ZuoraProductKey = keyof typeof prodTypes;

type ProductRatePlanKey<ZP extends ZuoraProductKey> =
	keyof (typeof prodTypes)[ZP]['productRatePlans'];

type ProductRatePlanChargeKey<
	ZP extends ZuoraProductKey,
	PRP extends ProductRatePlanKey<ZP>,
> = keyof (typeof prodTypes)[ZP]['productRatePlans'][PRP];

type ProductCurrency<ZP extends ZuoraProductKey> =
	keyof (typeof prodTypes)[ZP]['currencies'];

// export type ZuoraProductKey = keyof (typeof prodMapping)['products'];

// export type ProductRatePlanKey<ZP extends ZuoraProductKey> =
// 	keyof (typeof prodMapping)['products'][ZP]['ratePlans'];

// export type ProductRatePlanChargeKey<
// 	ZP extends ZuoraProductKey,
// 	PRP extends ProductRatePlanKey<ZP>,
// > = keyof (typeof prodMapping)['products'][ZP]['ratePlans'][PRP]['charges'];

//type ProductCurrency<ZP extends ZuoraProductKey>

export type ProductRatePlanCharge<ZP extends ZuoraProductKey> = {
	id: string;
	pricing: {
		[PC in ProductCurrency<ZP>]: number;
	};
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
): ProductRatePlan<ZP, PRP> => {
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
