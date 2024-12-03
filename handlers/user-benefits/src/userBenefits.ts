import { distinct } from '@modules/arrayFunctions';
import type {
	ProductCatalogHelper,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import { getSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import { productBenefitMapping } from './productBenefit';
import type {
	ProductBenefit,
	TrialInformation,
	UserBenefitsResponse,
} from './schemas';
import {
	feastExtendedTrial,
	feastRegularSubscription,
} from './trialInformation';

export const getUserBenefits = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	identityId: string,
): Promise<UserBenefitsResponse> => {
	const userProducts = await getUserProducts(
		stage,
		productCatalogHelper,
		identityId,
	);
	console.log(`User products for user ${identityId} are: `, userProducts);
	const benefits = getBenefits(userProducts);
	console.log(`Benefits for user ${identityId} are: `, benefits);
	const trials = getTrialInformation(benefits, userProducts);
	console.log(`Trials for user ${identityId} are: `, trials);
	return {
		benefits,
		trials,
	};
};

const getUserProducts = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	identityId: string,
) => {
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

export const getBenefits = (userProducts: ProductKey[]): ProductBenefit[] =>
	distinct(userProducts.flatMap((product) => productBenefitMapping[product]));

export const getTrialInformation = (
	productBenefits: ProductBenefit[],
	userProducts: ProductKey[],
): TrialInformation => {
	if (productBenefits.includes('feastApp')) {
		return {};
	}
	// TODO: this is all changing shortly
	if (userProducts.find((product) => product === 'GuardianWeeklyDomestic')) {
		return { feastApp: feastExtendedTrial };
	}
	return {
		feastApp: feastRegularSubscription,
	};
};
