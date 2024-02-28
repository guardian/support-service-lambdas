import { arrayToObject } from '@modules/arrayFunctions';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import {
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	getZuoraProductKey,
	isSupportedProduct,
	isSupportedProductRatePlan,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type {
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';

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
const getZuoraProduct = (productRatePlans: ZuoraProductRatePlan[]) => {
	return {
		ratePlans: arrayToObject(
			productRatePlans
				.filter((productRatePlan) =>
					isSupportedProductRatePlan(productRatePlan.name),
				)
				.map((productRatePlan) => {
					const productRatePlanKey = getProductRatePlanKey(
						productRatePlan.name,
					);
					return {
						[productRatePlanKey]: {
							id: productRatePlan.id,
							pricing: getPricingObject(productRatePlan.productRatePlanCharges),
							charges: getProductRatePlanCharges(
								productRatePlan.productRatePlanCharges,
							),
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

	const result = {
		products: arrayToObject(
			supportedProducts.map((product) => {
				const productName = getZuoraProductKey(product.name);
				return {
					[productName]: getZuoraProduct(product.productRatePlans),
				};
			}),
		),
	};

	return result as ProductCatalog;
};
