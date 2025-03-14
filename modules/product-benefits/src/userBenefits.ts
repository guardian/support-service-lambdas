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
import type {
	ProductBenefit,
	UserBenefitsOverrides,
} from '@modules/product-benefits/schemas';

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

const getOverrideBenefits = (
	identityId: string,
	userBenefitsOverrides: UserBenefitsOverrides,
): ProductBenefit[] | undefined => {
	const maybeOverride = userBenefitsOverrides.userOverrides.find(
		(user) => user.identityId === identityId,
	);

	return maybeOverride?.benefits;
};

const getUserBenefitsExcludingStaffAndOverrides = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	identityId: string,
): Promise<ProductBenefit[]> => {
	const userProducts = await getUserProducts(
		stage,
		productCatalogHelper,
		identityId,
	);

	return getUserBenefitsFromUserProducts(userProducts);
};

export const getUserBenefitsExcludingStaff = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	userBenefitsOverrides: UserBenefitsOverrides,
	identityId: string,
): Promise<ProductBenefit[]> => {
	const maybeOverrideBenefits = getOverrideBenefits(
		identityId,
		userBenefitsOverrides,
	);
	if (maybeOverrideBenefits !== undefined) {
		return Promise.resolve(maybeOverrideBenefits);
	}
	return getUserBenefitsExcludingStaffAndOverrides(
		stage,
		productCatalogHelper,
		identityId,
	);
};

export const getUserBenefits = (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	userBenefitsOverrides: UserBenefitsOverrides,
	userDetails: IdentityUserDetails,
): Promise<ProductBenefit[]> => {
	const maybeOverrideBenefits = getOverrideBenefits(
		userDetails.identityId,
		userBenefitsOverrides,
	);
	if (maybeOverrideBenefits !== undefined) {
		return Promise.resolve(maybeOverrideBenefits);
	}
	if (userHasGuardianEmail(userDetails.email)) {
		return Promise.resolve(allProductBenefits);
	}
	return getUserBenefitsExcludingStaffAndOverrides(
		stage,
		productCatalogHelper,
		userDetails.identityId,
	);
};

export const getUserBenefitsFromUserProducts = (
	userProducts: ProductKey[],
): ProductBenefit[] =>
	distinct(userProducts.flatMap((product) => productBenefitMapping[product]));
