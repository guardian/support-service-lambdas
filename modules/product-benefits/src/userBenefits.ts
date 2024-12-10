import { distinct } from '@modules/arrayFunctions';
import type { IdentityUserDetails } from '@modules/identity/identity';
import type {
	ProductCatalogHelper,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import { getSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import { productBenefitMapping } from '@modules/product-benefits/productBenefit';
import type { ProductBenefit } from '@modules/product-benefits/schemas';
import { allProductBenefits } from '@modules/product-benefits/schemas';

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
	return supporterProductDataItems
		.flatMap(
			(item) =>
				productCatalogHelper.findProductDetails(item.productRatePlanId)
					?.zuoraProduct,
		)
		.filter((product) => product !== undefined);
};

const userHasGuardianEmail = (email: string): boolean =>
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
