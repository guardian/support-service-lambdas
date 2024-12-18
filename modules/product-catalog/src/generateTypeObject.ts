import { arrayToObject, distinct } from '@modules/utils/arrayFunctions';
import type {
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import { oneTimeContributionTypeObject } from '@modules/product-catalog/oneTimeContributionProduct';
import { stripeTypeObject } from '@modules/product-catalog/stripeProducts';
import {
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	getZuoraProductKey,
	isSupportedProduct,
	isSupportedProductRatePlan,
} from '@modules/product-catalog/zuoraToProductNameMappings';

const getProductRatePlanCharges = (
	productRatePlanCharges: ZuoraProductRatePlanCharge[],
) => {
	return arrayToObject(
		productRatePlanCharges.map((productRatePlanCharge) => {
			const productRatePlanChargeName = getProductRatePlanChargeKey(
				productRatePlanCharge.name,
			);
			return {
				[productRatePlanChargeName]: {},
			};
		}),
	);
};
const getBillingPeriodsForProduct = (
	productRatePlans: ZuoraProductRatePlan[],
) =>
	distinct(
		productRatePlans
			.flatMap((productRatePlan) =>
				productRatePlan.productRatePlanCharges.flatMap(
					(charge) => charge.billingPeriod,
				),
			)
			.filter(
				(billingPeriod) =>
					billingPeriod !== null && billingPeriod != 'Specific_Weeks',
			) as string[],
	);
const getZuoraProduct = (productRatePlans: ZuoraProductRatePlan[]) => {
	const billingPeriods = getBillingPeriodsForProduct(productRatePlans);
	return {
		billingPeriods,
		productRatePlans: arrayToObject(
			productRatePlans
				.filter((productRatePlan) =>
					isSupportedProductRatePlan(productRatePlan.name),
				)
				.map((productRatePlan) => {
					const productRatePlanKey = getProductRatePlanKey(
						productRatePlan.name,
					);
					return {
						[productRatePlanKey]: getProductRatePlanCharges(
							productRatePlan.productRatePlanCharges,
						),
					};
				}),
		),
	};
};
export const generateTypeObject = (catalog: ZuoraCatalog) => {
	const supportedProducts = catalog.products.filter((product) =>
		isSupportedProduct(product.name),
	);

	const arrayVersion = supportedProducts.map((product) => {
		const productName = getZuoraProductKey(product.name);
		return {
			[productName]: getZuoraProduct(product.productRatePlans),
		};
	});

	const zuoraTypeObject = arrayToObject(arrayVersion);

	return {
		...oneTimeContributionTypeObject,
		...zuoraTypeObject,
		...stripeTypeObject,
	};
};
