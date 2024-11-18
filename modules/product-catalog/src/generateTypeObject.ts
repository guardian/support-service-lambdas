import { arrayToObject, distinct } from '@modules/arrayFunctions';
import type {
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
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
const getCurrenciesForProduct = (productRatePlans: ZuoraProductRatePlan[]) =>
	distinct(
		productRatePlans
			.flatMap((prp) => prp.productRatePlanCharges)
			.flatMap((charge) => charge.pricing)
			.map((price) => price.currency),
	);

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
	const currencies = getCurrenciesForProduct(productRatePlans);
	const billingPeriods = getBillingPeriodsForProduct(productRatePlans);
	return {
		currencies,
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

	return arrayToObject(arrayVersion);
};
