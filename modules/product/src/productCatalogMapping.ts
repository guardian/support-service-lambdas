import type { Stage } from '@modules/stage';
import codeMapping from './codeCatalogMapping.json';
import prodMapping from './prodCatalogMapping.json';
//import prodTypes from './prodTypes.json';

const mappingsForStage = (stage: Stage) =>
	stage === 'CODE' ? codeMapping : prodMapping;

type ZuoraProductKey = keyof typeof prodMapping;

type ProductRatePlanKey<ZP extends ZuoraProductKey> =
	keyof (typeof prodMapping)[ZP];

type MinimalProductRatePlanObject = { id: string };

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
			const { id } = getProductRatePlan(
				stage,
				zuoraProduct,
				productRatePlan,
			) as MinimalProductRatePlanObject;
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
