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
	keyof (typeof prodTypes)[ZP];

type ProductRatePlanChargeKey<
	ZP extends ZuoraProductKey,
	PRP extends ProductRatePlanKey<ZP>,
> = keyof (typeof prodTypes)[ZP][PRP];

type MappedCatalog = {
	[ZP in ZuoraProductKey]: {
		[PRP in ProductRatePlanKey<ZP>]: {
			id: string;
			charges: {
				[PRPC in ProductRatePlanChargeKey<ZP, PRP>]: string;
			};
		};
	};
};

export const getProductRatePlan = <
	ZP extends ZuoraProductKey,
	PRP extends ProductRatePlanKey<ZP>,
>(
	stage: Stage,
	zuoraProduct: ZP,
	productRatePlan: PRP,
) => mappingsForStage(stage)[zuoraProduct][productRatePlan];

export const getAllProductDetails = (stage: Stage) => {
	const stageMapping = mappingsForStage(stage);
	const zuoraProductKeys = Object.keys(stageMapping) as Array<
		keyof typeof stageMapping
	>;
	return zuoraProductKeys.flatMap((zuoraProduct) => {
		const zuoraProductObject = stageMapping[zuoraProduct];
		const productRatePlanKeys = Object.keys(zuoraProductObject) as Array<
			keyof typeof zuoraProductObject
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
