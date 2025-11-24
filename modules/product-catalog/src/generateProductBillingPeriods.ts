import { arrayToObject, distinct } from '@modules/arrayFunctions';
import { objectEntries } from '@modules/objectFunctions';
import type {
	ZuoraCatalog,
	ZuoraProductRatePlan,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import {
	getZuoraProductKey,
	isSupportedProduct,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type { StripeProduct, StripeProductKey } from './stripeProducts';
import { stripeProducts } from './stripeProducts';

const getBillingPeriodsForProduct = (
	productRatePlans: ZuoraProductRatePlan[],
) =>
	distinct(
		productRatePlans
			.flatMap((productRatePlan) =>
				productRatePlan.productRatePlanCharges.map(
					(charge) => charge.billingPeriod,
				),
			)
			.filter(
				(billingPeriod) =>
					billingPeriod !== null && billingPeriod !== 'Specific_Weeks',
			),
	).sort();

const getBillingPeriodsForStripeProduct = (
	productKey: StripeProductKey,
	product: StripeProduct,
): Record<string, string[]> => {
	const billingPeriods = Object.values(product.ratePlans).map(
		(ratePlan) => ratePlan.billingPeriod,
	);
	return {
		[productKey]: distinct(billingPeriods).sort(),
	};
};

export const generateProductBillingPeriods = (catalog: ZuoraCatalog) => {
	const supportedProducts = catalog.products.filter((product) =>
		isSupportedProduct(product.name),
	);
	const zuoraBillingPeriods = arrayToObject(
		supportedProducts.map((product) => {
			const productName = getZuoraProductKey(product.name);
			return {
				[productName]: getBillingPeriodsForProduct(product.productRatePlans),
			};
		}),
	);
	const stripeBillingPeriods = arrayToObject(
		objectEntries(stripeProducts).map(([productKey, product]) => {
			return getBillingPeriodsForStripeProduct(productKey, product);
		}),
	);
	return `
// ---------- This file is auto-generated. Do not edit manually. -------------

import type { ProductKey } from '@modules/product-catalog/productCatalog';
	
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- we are using this for type generation
	const productBillingPeriods = ${JSON.stringify({
		...zuoraBillingPeriods,
		...stripeBillingPeriods,
	})} as const;
	
	export type ProductBillingPeriod<P extends ProductKey> = (typeof productBillingPeriods)[P][number];
	`;
};
