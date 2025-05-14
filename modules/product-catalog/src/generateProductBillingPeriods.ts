import { arrayToObject, distinct } from '@modules/arrayFunctions';
import type {
	ZuoraCatalog,
	ZuoraProductRatePlan,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { Product } from '@modules/product-catalog/productCatalog';
import {
	getZuoraProductKey,
	isSupportedProduct,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type { StripeProductKey } from './stripeProducts';
import { stripeProducts } from './stripeProducts';

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

const getBillingPeriodsForStripeProduct = (
	productKey: StripeProductKey,
	product: Product<StripeProductKey>,
): Record<string, string[]> => {
	const billingPeriods = Object.entries(product.ratePlans).map(
		([, ratePlan]) => {
			const typed = ratePlan as {
				billingPeriod: string;
			};
			return typed.billingPeriod;
		},
	);
	return {
		[productKey]: distinct(billingPeriods),
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
		Object.entries(stripeProducts).map(([productKey, product]) => {
			return getBillingPeriodsForStripeProduct(
				productKey as StripeProductKey,
				product,
			);
		}),
	);
	return `import type { ProductKey } from '@modules/product-catalog/productCatalog';
	
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- we are using this for type generation
	const productBillingPeriods = ${JSON.stringify({
		...zuoraBillingPeriods,
		...stripeBillingPeriods,
	})} as const;
	
	export type ProductBillingPeriod<P extends ProductKey> = (typeof productBillingPeriods)[P][number];
	`;
};
