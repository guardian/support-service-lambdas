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

type ProductRatePlanChargeKey<
	PF extends ProductFamilyKey,
	ZP extends ZuoraProductKey<PF>,
	PRP extends ProductRatePlanKey<PF, ZP>,
> = keyof (typeof prodMapping)[PF][ZP][PRP];

type ProductFamily<PF extends ProductFamilyKey> = (typeof prodMapping)[PF];
type ZuoraProduct<
	PF extends ProductFamilyKey,
	ZP extends ZuoraProductKey<PF>,
> = ProductFamily<PF>[ZP];

type ProductRatePlanObject = { productRatePlanId: string };

export type ProductRatePlan<
	PF extends ProductFamilyKey,
	ZP extends ZuoraProductKey<PF>,
	PRP extends ProductRatePlanKey<PF, ZP>,
> = ZuoraProduct<PF, ZP>[PRP];

export const getProductRatePlanCharges = <
	PF extends ProductFamilyKey,
	ZP extends ZuoraProductKey<PF>,
	PRP extends ProductRatePlanKey<PF, ZP>,
	PRPC extends ProductRatePlanChargeKey<PF, ZP, PRP>,
>(
	stage: Stage,
	productFamily: PF,
	zuoraProduct: ZP,
	productRatePlan: PRP,
	productRatePlanCharge: PRPC,
) => {
	const productRatePlanObject =
		mappingsForStage(stage)[productFamily][zuoraProduct][productRatePlan][
			productRatePlanCharge
		];
	return productRatePlanObject;
};

export const getProductRatePlan = <
	PF extends ProductFamilyKey,
	ZP extends ZuoraProductKey<PF>,
	PRP extends ProductRatePlanKey<PF, ZP>,
>(
	stage: Stage,
	productFamily: PF,
	zuoraProduct: ZP,
	productRatePlan: PRP,
) => {
	return mappingsForStage(stage)[productFamily][zuoraProduct][productRatePlan];
};

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
				const productRatePlanObject = getProductRatePlan(
					stage,
					productFamily,
					zuoraProduct,
					productRatePlan,
				) as ProductRatePlanObject;
				return {
					productFamily,
					zuoraProduct,
					productRatePlan,
					productRatePlanId: productRatePlanObject.productRatePlanId,
				};
			});
		});
	});
};
export const findProductDetails = (stage: Stage, productRatePlanId: string) => {
	const allProducts = getAllProductDetails(stage);
	return allProducts.find(
		(product) => product.productRatePlanId === productRatePlanId,
	);
};
