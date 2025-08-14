import type {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import { isDeliveryProduct } from '@modules/product-catalog/productCatalog';
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

const deliveryContactSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	workEmail: z.string(),
	country: z.string(),
	state: z.string().nullish(),
	city: z.string(),
	address1: z.string(),
	address2: z.string().nullish(),
	postalCode: z.string(),
});

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

const generateProductSpecificFields = (
	productName: string,
): string | undefined => {
	if (productName === 'Contribution' || productName === 'SupporterPlus') {
		return 'amount: z.number(),';
	}
	if (isDeliveryProduct(productName)) {
		const deliveryFields = `
			firstDeliveryDate: z.date(),
			deliveryContact: deliveryContactSchema,`;
		if (productName === 'NationalDelivery') {
			return `${deliveryFields}
			deliveryAgent: z.string(),`;
		}
		return deliveryFields;
	}
	return '';
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
		ratePlan: ${ratePlanUnion}, ${generateProductSpecificFields(productName)}
	})`;
};

const generateRatePlanLiteral = (productRatePlan: ZuoraProductRatePlan) => {
	const productRatePlanKey = getProductRatePlanKey(productRatePlan.name);

	return `z.literal('${productRatePlanKey}')`;
};
