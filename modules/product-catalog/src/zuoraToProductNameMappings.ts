import { getIfDefined } from '@modules/nullAndUndefined';

const zuoraCatalogToProductKey: Record<string, string> = {
	'Digital Pack': 'DigitalSubscription',
	'Newspaper - National Delivery': 'NationalDelivery',
	'Supporter Plus': 'SupporterPlus',
	'Guardian Weekly - ROW': 'GuardianWeeklyRestOfWorld',
	'Guardian Weekly - Domestic': 'GuardianWeeklyDomestic',
	'Newspaper Digital Voucher': 'SubscriptionCard',
	Contributor: 'Contribution',
	'Newspaper Delivery': 'HomeDelivery',
	'Tier Three': 'TierThree',
} as const;

const zuoraCatalogToProductRatePlanKey: Record<string, string> = {
	'Digital Pack Monthly': 'Monthly',
	'Digital Pack Annual': 'Annual',
	'Digital Subscription One Year Fixed - One Time Charge': 'OneYearGift',
	'Digital Subscription Three Month Fixed - One Time Charge': 'ThreeMonthGift',
	'Supporter Plus Monthly': 'V1DeprecatedMonthly',
	'Supporter Plus Annual': 'V1DeprecatedAnnual',
	'Supporter Plus V2 - Monthly': 'Monthly',
	'Supporter Plus V2 - Annual': 'Annual',
	'Supporter Plus V2 & Guardian Weekly ROW - Monthly':
		'GuardianWeeklyRestOfWorldMonthly',
	'Supporter Plus V2 & Guardian Weekly Domestic - Monthly':
		'GuardianWeeklyDomesticMonthly',
	'Supporter Plus V2 & Guardian Weekly ROW - Annual':
		'GuardianWeeklyRestOfWorldAnnual',
	'Supporter Plus V2 & Guardian Weekly Domestic - Annual':
		'GuardianWeeklyDomesticAnnual',
	'Supporter Plus & Guardian Weekly ROW - Monthly': 'RestOfWorldMonthly',
	'Supporter Plus & Guardian Weekly Domestic - Monthly': 'DomesticMonthly',
	'Supporter Plus & Guardian Weekly ROW - Annual': 'RestOfWorldAnnual',
	'Supporter Plus & Guardian Weekly Domestic - Annual': 'DomesticAnnual',
	'GW Oct 18 - Annual - ROW': 'Annual',
	'GW Oct 18 - Monthly - ROW': 'Monthly',
	'GW Oct 18 - Quarterly - ROW': 'Quarterly',
	'GW GIFT Oct 18 - 1 Year - ROW': 'OneYearGift',
	'GW GIFT Oct 18 - 3 Month - ROW': 'ThreeMonthGift',
	'GW Oct 18 - Annual - Domestic': 'Annual',
	'GW Oct 18 - Monthly - Domestic': 'Monthly',
	'GW Oct 18 - Quarterly - Domestic': 'Quarterly',
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

const zuoraCatalogToProductRatePlanChargeKey: Record<string, string> = {
	'Digital Pack Monthly': 'Subscription',
	'Digital Pack Annual': 'Subscription',
	'Digital Subscription One Year Fixed - One Time Charge': 'Subscription',
	'Digital Subscription Three Month Fixed - One Time Charge': 'Subscription',
	'Digital Subscription Three Month Fixed - One Time': 'Subscription',
	'Supporter Plus Monthly': 'Subscription',
	'Supporter Plus Annual': 'Subscription',
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
	'Supporter Plus': 'SupporterPlus',
	'Guardian Weekly': 'GuardianWeekly',
} as const;
export const getZuoraProductKey = (product: string): string => {
	return getIfDefined(
		zuoraCatalogToProductKey[product],
		`Unexpected product type ${product}`,
	);
};
export const getProductRatePlanKey = (productRatePlan: string): string => {
	return getIfDefined(
		zuoraCatalogToProductRatePlanKey[productRatePlan],
		`Unexpected product rate plan type ${productRatePlan}`,
	);
};
export const getProductRatePlanChargeKey = (
	productRatePlanCharge: string,
): string => {
	return getIfDefined(
		zuoraCatalogToProductRatePlanChargeKey[productRatePlanCharge],
		`Unexpected product rate plan charge type ${productRatePlanCharge}`,
	);
};
export const isSupportedProductRatePlan = (productRatePlan: string) =>
	Object.keys(zuoraCatalogToProductRatePlanKey).includes(productRatePlan);
export const isSupportedProduct = (product: string) =>
	Object.keys(zuoraCatalogToProductKey).includes(product);
