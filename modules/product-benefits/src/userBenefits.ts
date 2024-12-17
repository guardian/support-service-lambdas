import { distinct } from '@modules/arrayFunctions';
import type { IdentityUserDetails } from '@modules/identity/identity';
import type {
	ProductCatalogHelper,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { getSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import {
	allProductBenefits,
	itemIsValidForProduct,
	productBenefitMapping,
} from '@modules/product-benefits/productBenefit';
import type { ProductBenefit } from '@modules/product-benefits/schemas';

export const getUserProducts = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	identityId: string,
): Promise<ProductKey[]> => {
	const supporterProductDataItems = await getSupporterProductData(
		stage,
		identityId,
	);
	if (supporterProductDataItems === undefined) {
		console.log('No supporter product data found');
		return [];
	}
	return getValidUserProducts(productCatalogHelper, supporterProductDataItems);
};

export const getValidUserProducts = (
	productCatalogHelper: ProductCatalogHelper,
	supporterProductDataItems: SupporterRatePlanItem[],
): ProductKey[] =>
	supporterProductDataItems
		.flatMap((item) => {
			const product = productCatalogHelper.findProductDetails(
				item.productRatePlanId,
			)?.zuoraProduct;

			if (product !== undefined && itemIsValidForProduct(item, product)) {
				return product;
			}
			return undefined;
		})
		.filter((product) => product !== undefined);

export const userHasGuardianEmail = (email: string): boolean =>
	email.endsWith('@theguardian.com') || email.endsWith('@guardian.co.uk');

export const getUserBenefits = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	userDetails: IdentityUserDetails,
): Promise<ProductBenefit[]> => {
	if (userHasGuardianEmail(userDetails.email)) {
		return allProductBenefits;
	}
	const userProducts = await getUserProducts(
		stage,
		productCatalogHelper,
		userDetails.identityId,
	);
	return getUserBenefitsFromUserProducts(userProducts);
};

export const getUserBenefitsFromUserProducts = (
	userProducts: ProductKey[],
): ProductBenefit[] =>
	distinct(userProducts.flatMap((product) => productBenefitMapping[product]));
