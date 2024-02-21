import { arrayToObject, distinct } from '@modules/arrayFunctions';
import type {
	Catalog,
	CatalogProductRatePlan,
	CatalogProductRatePlanCharge,
} from '@modules/catalog/catalogSchema';
import { checkDefined } from '@modules/nullAndUndefined';
import {
	getProductName,
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	isSupportedProduct,
	isSupportedProductRatePlan,
} from '@modules/product/catalogMappingGeneration';

const getProductRatePlanCharges = (
	productRatePlanCharges: CatalogProductRatePlanCharge[],
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
const getCurrenciesForProduct = (productRatePlan: CatalogProductRatePlan) =>
	distinct(
		productRatePlan.productRatePlanCharges.flatMap((charge) =>
			charge.pricing.map((price) => price.currency),
		),
	);

const getZuoraProduct = (productRatePlans: CatalogProductRatePlan[]) => {
	const currencies = getCurrenciesForProduct(
		checkDefined(
			productRatePlans[0],
			'Undefined productRatePlan in getZuoraProductObjects',
		),
	);
	return {
		currencies,
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
export const generateTypes = (catalog: Catalog) => {
	const supportedProducts = catalog.products.filter((product) =>
		isSupportedProduct(product.name),
	);

	const arrayVersion = supportedProducts.map((product) => {
		const productName = getProductName(product.name);
		return {
			[productName]: getZuoraProduct(product.productRatePlans),
		};
	});

	return arrayToObject(arrayVersion);
};
