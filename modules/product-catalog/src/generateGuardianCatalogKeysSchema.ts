import {
	getProductRatePlanKey,
	getZuoraProductKey,
	isSupportedProduct,
	isSupportedProductRatePlan,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
} from '@modules/zuora-catalog/zuoraCatalogSchema';

const header = `
// ---------- This file is auto-generated. Do not edit manually. -------------

import { z } from 'zod';
`;

const footer = `
	export type GuardianCatalogKeys = z.infer<typeof guardianCatalogKeysSchema>;
`;

export const generateGuardianCatalogKeysSchema = (
	catalog: ZuoraCatalog,
): string => {
	const supportedZuoraProducts = catalog.products
		.filter((product) => isSupportedProduct(product.name))
		.sort((a, b) =>
			getZuoraProductKey(a.name).localeCompare(getZuoraProductKey(b.name)),
		);

	const productSchemas = supportedZuoraProducts
		.map((product) => generateProductSchema(product))
		.join(',\n');

	return `${header}
	export const guardianCatalogKeysSchema = z.discriminatedUnion('productKey', [
		${productSchemas}
		]);
	${footer}
	`;
};

const generateProductSchema = (product: CatalogProduct) => {
	const productKey = getZuoraProductKey(product.name);
	const supportedRatePlans = product.productRatePlans
		.filter((productRatePlan) => isSupportedProductRatePlan(productRatePlan.name))
		.sort((a, b) => a.name.localeCompare(b.name));
	const ratePlanKeyLiterals = supportedRatePlans.map((productRatePlan) =>
		generateRatePlanKeyLiteral(productRatePlan),
	);
	const productRatePlanKeySchema =
		ratePlanKeyLiterals.length === 1
			? ratePlanKeyLiterals[0]
			: `z.union([
					${ratePlanKeyLiterals.join(',\n')},
				])`;

	return `z.object({
		productKey: z.literal('${productKey}'),
		productRatePlanKey: ${productRatePlanKeySchema},
	})`;
};

const generateRatePlanKeyLiteral = (productRatePlan: ZuoraProductRatePlan) => {
	const productRatePlanKey = getProductRatePlanKey(productRatePlan.name);

	return `z.literal('${productRatePlanKey}')`;
};
