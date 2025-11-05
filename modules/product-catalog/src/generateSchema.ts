import { distinct } from '@modules/arrayFunctions';
import { getIfDefined, isNotNull } from '@modules/nullAndUndefined';
import type {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import {
	isDeliveryProduct,
	supportsPromotions,
} from '@modules/product-catalog/productCatalog';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
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
`;

const footer = `});`;

export const generateSchema = (catalog: ZuoraCatalog): string => {
	const supportedZuoraProducts = catalog.products.filter((product) =>
		isSupportedProduct(product.name),
	);

	const discountRatePlan: ZuoraProductRatePlan = findDiscountRatePlan(catalog);

	const productKeys = supportedZuoraProducts
		.map((product) => getZuoraProductKey(product.name))
		.sort();

	const zuoraProductsSchema = supportedZuoraProducts
		.map((product) => generateZuoraProductSchema(product, discountRatePlan))
		.join(',\n');

	return `${header}
	  export const productKeys = ${JSON.stringify(productKeys)} as const;
	  export const productKeySchema = z.enum(productKeys);
	  export const termTypeSchema = z.enum(['Recurring', 'FixedTerm']);
	  
		export const productCatalogSchema = z.object({
		${stripeProductsSchema},
		${zuoraProductsSchema}
		${footer}`;
};

export function findDiscountRatePlan(
	catalog: ZuoraCatalog,
): ZuoraProductRatePlan {
	return getIfDefined(
		catalog.products
			.find((product) => product.name === 'Discounts')
			?.productRatePlans.find((ratePlan) => ratePlan.name === 'Percentage'),
		'Discount rate plan not found in Zuora catalog',
	);
}

function getRatePlanSchema(
	product: CatalogProduct,
	discountRatePlan: ZuoraProductRatePlan,
) {
	const productSupportsDiscounts = supportsPromotions(
		productKeySchema.parse(getZuoraProductKey(product.name)),
	);
	const supportedRatePlans = product.productRatePlans.filter(
		(productRatePlan) => isSupportedProductRatePlan(productRatePlan.name),
	);
	const allRatePlans = productSupportsDiscounts
		? [...supportedRatePlans, discountRatePlan]
		: supportedRatePlans;
	return allRatePlans
		.map((productRatePlan) => generateProductRatePlanSchema(productRatePlan))
		.join(',\n');
}

const generateZuoraProductSchema = (
	product: CatalogProduct,
	discountRatePlan: ZuoraProductRatePlan,
) => {
	const productKey = getZuoraProductKey(product.name);
	const ratePlanSchema = getRatePlanSchema(product, discountRatePlan);

	return `${productKey}: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(${isDeliveryProduct(productKey)}),
		ratePlans: z.object({
			${ratePlanSchema},
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
		termType: termTypeSchema,
		termLengthInMonths: z.number(),
	})`;
};

const generatePricingSchema = (productRatePlan: ZuoraProductRatePlan) => {
	if (productRatePlan.name === 'Percentage') {
		return 'z.object({})';
	}
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
