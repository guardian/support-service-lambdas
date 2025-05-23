import { distinct } from '@modules/arrayFunctions';
import { isNotNull } from '@modules/nullAndUndefined';
import type {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import { stripeProductsSchema } from '@modules/product-catalog/stripeProducts';
import {
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	getZuoraProductKey,
	isSupportedProduct,
	isSupportedProductRatePlan,
} from '@modules/product-catalog/zuoraToProductNameMappings';

const header = `
// ---------- This file is auto-generated. Do not edit manually. -------------

import { z } from 'zod';

export const productCatalogSchema = z.object({`;

const footer = `});`;

export const generateSchema = (catalog: ZuoraCatalog): string => {
	const supportedZuoraProducts = catalog.products.filter((product) =>
		isSupportedProduct(product.name),
	);

	const zuoraProductsSchema = supportedZuoraProducts
		.map((product) => generateZuoraProductSchema(product))
		.join(',\n');

	return `${header}
		${stripeProductsSchema},
		${zuoraProductsSchema}
		${footer}`;
};

const generateZuoraProductSchema = (product: CatalogProduct) => {
	const productName = getZuoraProductKey(product.name);
	const supportedRatePlans = product.productRatePlans.filter(
		(productRatePlan) => isSupportedProductRatePlan(productRatePlan.name),
	);
	const ratePlanSchema = supportedRatePlans.map((productRatePlan) =>
		generateProductRatePlanSchema(productRatePlan),
	);

	return `${productName}: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			${ratePlanSchema.join(',\n')},
		}),
	})`;
};

const generateProductRatePlanSchema = (
	productRatePlan: ZuoraProductRatePlan,
) => {
	const productRatePlanKey = getProductRatePlanKey(productRatePlan.name);
	const ratePlanChargesSchema = productRatePlan.productRatePlanCharges.map(
		(productRatePlanCharge) =>
			generateProductRatePlanChargeSchema(productRatePlanCharge),
	);

	return `'${productRatePlanKey}': z.object({
		id: z.string(),
		pricing: ${generatePricingSchema(productRatePlan)},
		charges: z.object({
			${ratePlanChargesSchema.join(',\n')},
		}),
		${getBillingPeriodForRatePlan(productRatePlan)}
	})`;
};

const generatePricingSchema = (productRatePlan: ZuoraProductRatePlan) => {
	const currencies = distinct(
		productRatePlan.productRatePlanCharges.flatMap((charge) =>
			charge.pricing.map((price) => price.currency),
		),
	);
	const pricingSchema = currencies.map((currency) => `${currency}: z.number()`);
	return `z.object({${pricingSchema.join(',\n')}\n})`;
};

const generateProductRatePlanChargeSchema = (
	productRatePlanCharge: ZuoraProductRatePlanCharge,
) => {
	const productRatePlanChargeKey = getProductRatePlanChargeKey(
		productRatePlanCharge.name,
	);
	return `${productRatePlanChargeKey}: z.object({
		id: z.string(),
	})`;
};

const getBillingPeriodForRatePlan = (productRatePlan: ZuoraProductRatePlan) => {
	const billingPeriod = productRatePlan.productRatePlanCharges
		.map((productRatePlanCharge) => productRatePlanCharge.billingPeriod)
		.filter(isNotNull)
		.filter((billingPeriod) => billingPeriod != 'Specific_Weeks')[0];
	return billingPeriod !== undefined
		? `billingPeriod: z.literal('${billingPeriod}'),`
		: '';
};
