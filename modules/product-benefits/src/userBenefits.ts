import { distinct } from '@modules/arrayFunctions';
import type { IdentityUserDetails } from '@modules/identity/identity';
import type {
	ProductCatalogHelper,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { getSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import dayjs from 'dayjs';
import {
	inAppPurchaseProductKey,
	isInAppPurchase,
} from '@modules/product-benefits/inAppPurchase';
import type { InAppPurchaseProductKey } from '@modules/product-benefits/inAppPurchase';
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
): Promise<Array<ProductKey | InAppPurchaseProductKey>> => {
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
): Array<ProductKey | InAppPurchaseProductKey> =>
	supporterProductDataItems
		.filter((item) => dayjs(item.termEndDate) >= dayjs().startOf('day'))
		.flatMap((item) => {
			// In app purchases are not currently in the product catalog so we need to handle them separately
			if (isInAppPurchase(item.productRatePlanId)) {
				return inAppPurchaseProductKey;
			}

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

export const getUserBenefitsExcludingStaff = async (
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

export const getUserBenefits = (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	userDetails: IdentityUserDetails,
): Promise<ProductBenefit[]> => {
	if (userHasGuardianEmail(userDetails.email)) {
		return Promise.resolve(allProductBenefits);
	}
	return getUserBenefitsExcludingStaff(
		stage,
		productCatalogHelper,
		userDetails.identityId,
	);
};

export const getUserBenefitsFromUserProducts = (
	userProducts: Array<ProductKey | InAppPurchaseProductKey>,
): ProductBenefit[] =>
	distinct(userProducts.flatMap((product) => productBenefitMapping[product]));
