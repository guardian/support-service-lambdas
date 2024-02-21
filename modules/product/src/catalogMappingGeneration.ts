import type {
	Catalog,
	CatalogProductRatePlan,
	CatalogProductRatePlanCharge,
} from '@modules/catalog/catalogSchema';
import { checkDefined } from '@modules/nullAndUndefined';

// const getProductFamily = (product: string): string => {
// 	return checkDefined(
// 		catalogNamesToProductFamily[product],
// 		`Unexpected product type ${product}`,
// 	);
// };
export const getProductName = (product: string): string => {
	return checkDefined(
		catalogNamesToProduct[product],
		`Unexpected product type ${product}`,
	);
};

export const getProductRatePlanName = (productRatePlan: string): string => {
	return checkDefined(
		productRatePlanNamesToProductRatePlan[productRatePlan],
		`Unexpected product rate plan type ${productRatePlan}`,
	);
};

export const getProductRatePlanChargeName = (
	productRatePlanCharge: string,
): string => {
	return checkDefined(
		productRatePlanChargeNamesToProductRatePlanCharge[productRatePlanCharge],
		`Unexpected product rate plan charge type ${productRatePlanCharge}`,
	);
};
const catalogNamesToProductFamily: Record<string, string> = {
	'Digital Pack': 'Digital',
	'Newspaper - National Delivery': 'Newspaper',
	'Supporter Plus': 'Digital',
	'Guardian Weekly - ROW': 'GuardianWeekly',
	'Guardian Weekly - Domestic': 'GuardianWeekly',
	'Newspaper Digital Voucher': 'Newspaper',
	Contributor: 'Digital',
	'Newspaper Delivery': 'Newspaper',
} as const;

export const catalogNamesToProduct: Record<string, string> = {
	'Digital Pack': 'DigitalSubscription',
	'Newspaper - National Delivery': 'NationalDelivery',
	'Supporter Plus': 'SupporterPlus',
	'Guardian Weekly - ROW': 'GuardianWeeklyRestOfWorld',
	'Guardian Weekly - Domestic': 'GuardianWeeklyDomestic',
	'Newspaper Digital Voucher': 'SubscriptionCard',
	Contributor: 'Contribution',
	'Newspaper Delivery': 'HomeDelivery',
} as const;

export const productRatePlanNamesToProductRatePlan: Record<string, string> = {
	'Digital Pack Monthly': 'Monthly',
	'Digital Pack Annual': 'Annual',
	'Digital Subscription One Year Fixed - One Time Charge': 'OneYearGift',
	'Digital Subscription Three Month Fixed - One Time Charge': 'ThreeMonthGift',
	'Supporter Plus V2 - Monthly': 'Monthly',
	'Supporter Plus V2 - Annual': 'Annual',
	'GW Oct 18 - Annual - ROW': 'Annual',
	'GW Oct 18 - Monthly - ROW': 'Monthly',
	'GW Oct 18 - Quarterly - ROW': 'Quarterly',
	'GW Oct 18 - Six for Six - ROW': 'SixWeekly',
	'GW GIFT Oct 18 - 1 Year - ROW': 'OneYearGift',
	'GW GIFT Oct 18 - 3 Month - ROW': 'ThreeMonthGift',
	'GW Oct 18 - Annual - Domestic': 'Annual',
	'GW Oct 18 - Monthly - Domestic': 'Monthly',
	'GW Oct 18 - Quarterly - Domestic': 'Quarterly',
	'GW Oct 18 - Six for Six - Domestic': 'SixWeekly',
	'GW GIFT Oct 18 - 1 Year - Domestic': 'OneYearGift',
	'GW GIFT Oct 18 - 3 Month - Domestic': 'ThreeMonthGift',
	'Annual Contribution': 'Annual',
	'Monthly Contribution': 'Monthly',
	Everyday: 'Everyday',
	Saturday: 'Saturday',
	Sunday: 'Sunday',
	Weekend: 'Weekend',
	Sixday: 'Sixday',
} as const;

export const productRatePlanChargeNamesToProductRatePlanCharge: Record<
	string,
	string
> = {
	'Digital Pack Monthly': 'Subscription',
	'Digital Pack Annual': 'Subscription',
	'Digital Subscription One Year Fixed - One Time Charge': 'Subscription',
	'Digital Subscription Three Month Fixed - One Time Charge': 'Subscription',
	'Digital Subscription Three Month Fixed - One Time': 'Subscription',
	'Supporter Plus Monthly Charge': 'Subscription',
	'Supporter Plus Annual Charge': 'Subscription',
	'Annual Contribution': 'Contribution',
	'Monthly Contribution': 'Contribution',
	'GW Oct 18 - Annual - ROW': 'Subscription',
	'GW Oct 18 - Monthly - ROW': 'Monthly',
	'GW Oct 18 - Quarterly - ROW': 'Subscription',
	'GW Oct 18 - First 6 issues - ROW': 'Subscription',
	'GW GIFT Oct 18 - 1 Year - ROW': 'Subscription',
	'GW GIFT Oct 18 - 3 Month - ROW': 'Subscription',
	'GW Oct 18 - Annual - Domestic': 'Subscription',
	'GW Oct 18 - Monthly - Domestic': 'Subscription',
	'GW Oct 18 - Quarterly - Domestic': 'Subscription',
	'GW Oct 18 - First 6 issues - Domestic': 'Subscription',
	'GW GIFT Oct 18 - 1 Year - Domestic': 'Subscription',
	'GW GIFT Oct 18 - 3 Month - Domestic': 'Subscription',
	Contribution: 'Contribution',
	Subscription: 'Subscription',
	Saturday: 'Saturday',
	Sunday: 'Sunday',
	Monday: 'Monday',
	Tuesday: 'Tuesday',
	Wednesday: 'Wednesday',
	Thursday: 'Thursday',
	Friday: 'Friday',
} as const;

export const isSupportedProductRatePlan = (productRatePlan: string) =>
	Object.keys(productRatePlanNamesToProductRatePlan).includes(productRatePlan);
export const isSupportedProduct = (product: string) =>
	Object.keys(catalogNamesToProductFamily).includes(product);

const arrayToObject = <T>(array: Array<Record<string, T>>) => {
	return array.reduce((acc, val) => {
		return { ...acc, ...val };
	}, {});
};

type NonNullPrice = { currency: string; price: number };
type PricingObject = Record<string, number>;

const roundPriceToTwoDecimalPlaces = (price: number) => {
	return parseFloat(price.toFixed(2));
};
const getPricingObject = (charges: CatalogProductRatePlanCharge[]) => {
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
const getProductRatePlanChargeObjects = (
	productRatePlanCharges: CatalogProductRatePlanCharge[],
) => {
	return arrayToObject(
		productRatePlanCharges.map((productRatePlanCharge) => {
			const productRatePlanChargeName = getProductRatePlanChargeName(
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
const getZuoraProductObjects = (productRatePlans: CatalogProductRatePlan[]) => {
	return {
		ratePlans: arrayToObject(
			productRatePlans
				.filter((productRatePlan) =>
					isSupportedProductRatePlan(productRatePlan.name),
				)
				.map((productRatePlan) => {
					const productRatePlanName = getProductRatePlanName(
						productRatePlan.name,
					);
					return {
						[productRatePlanName]: {
							id: productRatePlan.id,
							pricing: getPricingObject(productRatePlan.productRatePlanCharges),
							charges: getProductRatePlanChargeObjects(
								productRatePlan.productRatePlanCharges,
							),
						},
					};
				}),
		),
	};
};
export const generateCatalogMapping = (catalog: Catalog) => {
	const supportedProducts = catalog.products.filter((product) =>
		isSupportedProduct(product.name),
	);

	const result = {
		products: arrayToObject(
			supportedProducts.map((product) => {
				const productName = getProductName(product.name);
				return {
					[productName]: getZuoraProductObjects(product.productRatePlans),
				};
			}),
		),
	};

	// // Nest the Zuora products under the product family they belong to
	// const groupedByProductFamily = groupBy(
	// 	arrayVersion,
	// 	(product) => product.productFamily,
	// );
	//
	// const nestedObject = Object.entries(groupedByProductFamily).map(
	// 	([key, value]) => {
	// 		const objectsWithoutProductFamily = value.map((product) => {
	// 			const { productFamily, ...otherFields } = product;
	// 			return otherFields;
	// 		});
	// 		return {
	// 			[key]: arrayToObject(objectsWithoutProductFamily),
	// 		};
	// 	},
	// );

	return result;
};
