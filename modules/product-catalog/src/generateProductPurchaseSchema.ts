import type {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import {
	getProductRatePlanKey,
	getZuoraProductKey,
	isSupportedProduct,
	isSupportedProductRatePlan,
} from '@modules/product-catalog/zuoraToProductNameMappings';

const header = `
// ---------- This file is auto-generated. Do not edit manually. -------------

// This schema is used mostly in support-frontend to validate the 
// product and rate plan passed in the support-workers state

import { z } from 'zod';
import { ProductKey } from '@modules/product-catalog/productCatalog';
`;

const footer = `
	export type ProductPurchase = z.infer<typeof productPurchaseSchema>;
	// Generic type for a specific product
	export type ProductPurchaseFor<P extends ProductKey> = Extract<ProductPurchase,{ product: P }>;
`;

export const generateProductPurchaseSchema = (
	catalog: ZuoraCatalog,
): string => {
	const supportedZuoraProducts = catalog.products.filter((product) =>
		isSupportedProduct(product.name),
	);

	const zuoraProductsSchema = supportedZuoraProducts
		.map((product) => generateProductsSchema(product))
		.join(',\n');

	return `${header}
	export const productPurchaseSchema = z.discriminatedUnion('product', [
		${zuoraProductsSchema}
		]);
	${footer}
	`;
};

const productAllowsAmountOverride = (product: string): boolean => {
	return product === 'Contribution' || product === 'SupporterPlus';
};

const generateProductsSchema = (product: CatalogProduct) => {
	const productName = getZuoraProductKey(product.name);
	const supportedRatePlans = product.productRatePlans.filter(
		(productRatePlan) => isSupportedProductRatePlan(productRatePlan.name),
	);
	const ratePlanLiterals = supportedRatePlans.map((productRatePlan) =>
		generateRatePlanLiteral(productRatePlan),
	);
	const ratePlanUnion =
		ratePlanLiterals.length == 1
			? ratePlanLiterals[0]
			: `z.union([
					${ratePlanLiterals.join(',\n')},
				])`;

	return `z.object({
		product: z.literal('${productName}'),
		ratePlan: ${ratePlanUnion},
		${productAllowsAmountOverride(productName) ? 'amount: z.number(),' : ''}
	})`;
};

const generateRatePlanLiteral = (productRatePlan: ZuoraProductRatePlan) => {
	const productRatePlanKey = getProductRatePlanKey(productRatePlan.name);

	return `z.literal('${productRatePlanKey}')`;
};
