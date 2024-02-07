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

type ProductRatePlanObject = { productRatePlanId: string };

export const getProductRatePlanCharges = <
	P extends ProductFamilyKey,
	ZP extends ZuoraProductKey<P>,
	PRP extends ProductRatePlanKey<P, ZP>,
	PRPC extends ProductRatePlanChargeKey<P, ZP, PRP>,
>(
	stage: Stage,
	productFamily: P,
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

export const getProductRatePlanId = <
	P extends ProductFamilyKey,
	ZP extends ZuoraProductKey<P>,
	PRP extends ProductRatePlanKey<P, ZP>,
>(
	stage: Stage,
	productFamily: P,
	zuoraProduct: ZP,
	productRatePlan: PRP,
) => {
	const productRatePlanObject = mappingsForStage(stage)[productFamily][
		zuoraProduct
	][productRatePlan] as ProductRatePlanObject;
	return productRatePlanObject.productRatePlanId;
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
				const productRatePlanId = getProductRatePlanId(
					stage,
					productFamily,
					zuoraProduct,
					productRatePlan,
				);
				return {
					productFamily,
					zuoraProduct,
					productRatePlan,
					productRatePlanId: productRatePlanId,
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
