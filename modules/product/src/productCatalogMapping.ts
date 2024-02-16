import type { Stage } from '@modules/stage';
import codeMapping from './codeCatalogMapping.json';
import prodMapping from './prodCatalogMapping.json';

const mappingsForStage = (stage: Stage) =>
	stage === 'CODE' ? codeMapping : prodMapping;

type ProductFamilyKey = keyof typeof prodMapping;

type ZuoraProductKey<PF extends ProductFamilyKey> =
	keyof (typeof prodMapping)[PF];

type ProductRatePlanKey<
	PF extends ProductFamilyKey,
	ZP extends ZuoraProductKey<PF>,
> = keyof (typeof prodMapping)[PF][ZP];

type MinimalProductRatePlanObject = { id: string };

export const getProductRatePlan = <
	PF extends ProductFamilyKey,
	ZP extends ZuoraProductKey<PF>,
	PRP extends ProductRatePlanKey<PF, ZP>,
>(
	stage: Stage,
	productFamily: PF,
	zuoraProduct: ZP,
	productRatePlan: PRP,
) => mappingsForStage(stage)[productFamily][zuoraProduct][productRatePlan];

export const getAllProductDetails = (stage: Stage) => {
	const stageMapping = mappingsForStage(stage);
	const keys = Object.keys(stageMapping) as Array<keyof typeof stageMapping>;
	return keys.flatMap((productFamily) => {
		const productFamilyObject = stageMapping[productFamily];
		const zuoraProductKeys = Object.keys(productFamilyObject) as Array<
			keyof typeof productFamilyObject
		>;
		return zuoraProductKeys.flatMap((zuoraProduct) => {
			const zuoraProductObject = productFamilyObject[zuoraProduct];
			const productRatePlanKeys = Object.keys(zuoraProductObject) as Array<
				keyof typeof zuoraProductObject
			>;
			return productRatePlanKeys.flatMap((productRatePlan) => {
				const { id } = getProductRatePlan(
					stage,
					productFamily,
					zuoraProduct,
					productRatePlan,
				) as MinimalProductRatePlanObject;
				return {
					productFamily,
					zuoraProduct,
					productRatePlan,
					id,
				};
			});
		});
	});
};
export const findProductDetails = (stage: Stage, productRatePlanId: string) => {
	const allProducts = getAllProductDetails(stage);
	return allProducts.find((product) => product.id === productRatePlanId);
};
