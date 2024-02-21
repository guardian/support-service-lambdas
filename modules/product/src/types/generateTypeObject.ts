import fs from 'fs';
import { arrayToObject, distinct } from '@modules/arrayFunctions';
import { getCatalogFromS3 } from '@modules/catalog/catalog';
import type {
	Catalog,
	CatalogProductRatePlan,
	CatalogProductRatePlanCharge,
} from '@modules/catalog/catalogSchema';
import { checkDefined } from '@modules/nullAndUndefined';
import {
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	getZuoraProductKey,
	isSupportedProduct,
	isSupportedProductRatePlan,
} from '@modules/product/types/zuoraCatalogToProductCatalogMappings';

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
export const generateTypeObject = (catalog: Catalog) => {
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

const writeTypesToFile = async () => {
	const prodCatalog = await getCatalogFromS3('PROD');
	const types = generateTypeObject(prodCatalog);
	const typesString = JSON.stringify(types, null, 2);

	fs.writeFileSync(
		'./src/types/typeObject.ts',
		`export const typeObject = ${typesString} as const;`,
	);
};

void (async function () {
	await writeTypesToFile();
})();
