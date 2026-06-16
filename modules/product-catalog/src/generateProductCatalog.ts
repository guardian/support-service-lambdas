import { arrayToObject } from '@modules/arrayFunctions';
import { isBillingPeriod } from '@modules/billingPeriod';
import {
	type ZuoraCatalog,
	type ZuoraProductRatePlan,
	type ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import { findDiscountRatePlan } from '@modules/product-catalog/generateSchema';
import type {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import {
	getCustomerFacingName,
	isDeliveryProduct,
	supportsPromotions,
} from '@modules/product-catalog/productCatalog';
import {
	productCatalogSchema,
	productKeySchema,
} from '@modules/product-catalog/productCatalogSchema';
import { stripeProducts } from '@modules/product-catalog/stripeProducts';
import {
	activeProducts,
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	getTermLength,
	getTermTypeName,
	getZuoraProductKey,
	isSupportedProduct,
	isSupportedProductRatePlan,
} from '@modules/product-catalog/zuoraToProductNameMappings';

type NonNullPrice = { currency: string; price: number };
type PricingObject = Record<string, number>;

const roundPriceToTwoDecimalPlaces = (price: number) => {
	return parseFloat(price.toFixed(2));
};
const getPricingObject = (charges: ZuoraProductRatePlanCharge[]) => {
	const allPrices = charges.flatMap((charge) => {
		return charge.pricing
			.map(({ currency, price }) => ({ currency, price }))
			.filter<NonNullPrice>(
				(price): price is NonNullPrice => price.price != null,
			);
	});

	return allPrices.reduce<PricingObject>((acc, price) => {
		const total = (acc[price.currency] ?? 0) + price.price;
		acc[price.currency] = roundPriceToTwoDecimalPlaces(total);
		return acc;
	}, {});
};
const getProductRatePlanCharges = (
	productRatePlanCharges: ZuoraProductRatePlanCharge[],
) => {
	return arrayToObject(
		productRatePlanCharges.map((productRatePlanCharge) => {
			const productRatePlanChargeName = getProductRatePlanChargeKey(
				productRatePlanCharge.name,
			);
			return {
				[productRatePlanChargeName]: {
					id: productRatePlanCharge.id,
				},
			};
		}),
	);
};

/**
 * We use this to hoist billing period from the `productRatePlanCharges` up into the `ratePlans`
 * if-and-only-if all the charges have the same `billingPeriod`.
 */
const getBillingPeriod = (productRatePlan: ZuoraProductRatePlan) => {
	const billingPeriods = new Set(
		productRatePlan.productRatePlanCharges.map(
			(productRatePlanCharge) => productRatePlanCharge.billingPeriod,
		),
	);
	if (billingPeriods.size > 1) {
		const errorList = [...billingPeriods].join(',');
		throw new Error(
			`Product rate plan ${productRatePlan.name} has multiple billingPeriods ${errorList}`,
		);
	}

	const [billingPeriod] = billingPeriods;
	// billingPeriod as null is valid from Zuora, which is used for one-time charges e.g. gifts
	if (billingPeriod === null) {
		return;
	}

	if (!isBillingPeriod(billingPeriod)) {
		throw new ReferenceError(`Unexpected billing period ${billingPeriod}`);
	}

	return billingPeriod;
};

const getZuoraProduct = (
	productName: ProductKey,
	productRatePlans: ZuoraProductRatePlan[],
	discountRatePlan: ZuoraProductRatePlan,
) => {
	const supportedProductRatePlans = productRatePlans.filter((productRatePlan) =>
		isSupportedProductRatePlan(productRatePlan.name),
	);
	const allRatePlans = supportsPromotions(productKeySchema.parse(productName))
		? [...supportedProductRatePlans, discountRatePlan]
		: supportedProductRatePlans;
	return {
		billingSystem: 'zuora',
		active: activeProducts.includes(productName),
		customerFacingName: getCustomerFacingName(productName),
		isDeliveryProduct: isDeliveryProduct(productName),
		ratePlans: arrayToObject(
			allRatePlans.map((productRatePlan) => {
				const billingPeriod = getBillingPeriod(productRatePlan);
				const productRatePlanKey = getProductRatePlanKey(productRatePlan.name);
				const taxModes = productRatePlan.productRatePlanCharges.map(
					(charge) => charge.taxMode,
				);
				const uniqueTaxModeCount = new Set(taxModes).size;

				if (uniqueTaxModeCount !== 1) {
					throw new Error(
						`productRatePlan ${productRatePlan.id} has charges with <1 or >1 taxModes: ${taxModes.join(', ')}`,
					);
				}

				return {
					[productRatePlanKey]: {
						id: productRatePlan.id,
						pricing: getPricingObject(productRatePlan.productRatePlanCharges),
						charges: getProductRatePlanCharges(
							productRatePlan.productRatePlanCharges,
						),
						termType: getTermTypeName(productRatePlan.TermType__c),
						termLengthInMonths: getTermLength(productRatePlan.DefaultTerm__c),
						...(billingPeriod && { billingPeriod }),
						taxMode: taxModes[0],
					},
				};
			}),
		),
	};
};
export const generateProductCatalog = (
	catalog: ZuoraCatalog,
): ProductCatalog => {
	const supportedProducts = catalog.products.filter((product) =>
		isSupportedProduct(product.name),
	);

	const discountRatePlan = findDiscountRatePlan(catalog);

	const result = arrayToObject(
		supportedProducts.map((product) => {
			const productName = getZuoraProductKey(product.name);
			return {
				[productName]: getZuoraProduct(
					productName,
					product.productRatePlans,
					discountRatePlan,
				),
			};
		}),
	);
	const productCatalog = {
		...stripeProducts,
		...result,
	};
	return productCatalogSchema.parse(productCatalog);
};
