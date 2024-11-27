import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { getSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import type { ProductBenefit } from './productBenefit';
import { productBenefitMapping } from './productBenefit';
import type { TrialInformation } from './trialInformation';
import { feastExtendedTrial } from './trialInformation';

export type UserBenefitsResponse = {
	benefits: ProductBenefit[];
	trials: Partial<Record<ProductBenefit, TrialInformation>>;
};
export const getUserBenefits = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	identityId: string,
): Promise<UserBenefitsResponse> => {
	const supporterProductDataItems = await getSupporterProductData(
		stage,
		identityId,
	);

	return Promise.resolve({
		benefits: getBenefits(productCatalogHelper, supporterProductDataItems),
		trials: {
			feastApp: feastExtendedTrial,
		},
	});
};

export const getBenefits = (
	productCatalogHelper: ProductCatalogHelper,
	supporterProductDataItems: SupporterRatePlanItem[] | undefined,
): ProductBenefit[] => {
	if (supporterProductDataItems === undefined) {
		return [];
	}
	const userProducts = supporterProductDataItems
		.flatMap(
			(item) =>
				productCatalogHelper.findProductDetails(item.productRatePlanId)
					?.zuoraProduct,
		)
		.filter((product) => product !== undefined);

	const userProductBenefits = userProducts.flatMap(
		(product) => productBenefitMapping[product],
	);
	return userProductBenefits;
};
