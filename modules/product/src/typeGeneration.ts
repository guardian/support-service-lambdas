import { arrayToObject } from '@modules/arrayFunctions';
import type {
	Catalog,
	CatalogProductRatePlan,
	CatalogProductRatePlanCharge,
} from '@modules/catalog/catalogSchema';
import { checkDefined } from '@modules/nullAndUndefined';
import {
	getProductName,
	getProductRatePlanChargeName,
	getProductRatePlanName,
	isSupportedProduct,
	isSupportedProductRatePlan,
} from '@modules/product/catalogMappingGeneration';

const getProductRatePlanChargeObjects = (
	productRatePlanCharges: CatalogProductRatePlanCharge[],
) => {
	return arrayToObject(
		productRatePlanCharges.map((productRatePlanCharge) => {
			const productRatePlanChargeName = getProductRatePlanChargeName(
				productRatePlanCharge.name,
			);
			return {
				[productRatePlanChargeName]: {},
			};
		}),
	);
};
const getCurrenciesForProduct = (productRatePlan: CatalogProductRatePlan) =>
	productRatePlan.productRatePlanCharges.flatMap((charge) =>
		charge.pricing.map((price) => price.currency),
	);

const getZuoraProductObjects = (productRatePlans: CatalogProductRatePlan[]) => {
	const currencies = getCurrenciesForProduct(
		checkDefined(
			productRatePlans[0],
			'Undefined productRatePlan in getZuoraProductObjects',
		),
	).map((currency) => ({ [currency]: {} }));
	return {
		currencies: arrayToObject(currencies),
		productRatePlans: arrayToObject(
			productRatePlans
				.filter((productRatePlan) =>
					isSupportedProductRatePlan(productRatePlan.name),
				)
				.map((productRatePlan) => {
					const productRatePlanName = getProductRatePlanName(
						productRatePlan.name,
					);
					return {
						[productRatePlanName]: getProductRatePlanChargeObjects(
							productRatePlan.productRatePlanCharges,
						),
					};
				}),
		),
	};
};
export const generateTypes = (catalog: Catalog) => {
	const supportedProducts = catalog.products.filter((product) =>
		isSupportedProduct(product.name),
	);

	const arrayVersion = supportedProducts.map((product) => {
		const productName = getProductName(product.name);
		return {
			[productName]: getZuoraProductObjects(product.productRatePlans),
		};
	});

	return arrayToObject(arrayVersion);
};
