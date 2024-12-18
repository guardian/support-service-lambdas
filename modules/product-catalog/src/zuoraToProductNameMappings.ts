import { getIfDefined } from '@modules/utils/nullAndUndefined';

const zuoraCatalogToProductKey: Record<string, string> = {
	'Guardian Light': 'GuardianLight',
	Contributor: 'Contribution',
	'Supporter Plus': 'SupporterPlus',
	'Digital Pack': 'DigitalSubscription',
	'Tier Three': 'TierThree',
	// Newspaper products
	'Newspaper Delivery': 'HomeDelivery',
	'Newspaper - National Delivery': 'NationalDelivery',
	'Newspaper Digital Voucher': 'SubscriptionCard',
	'Newspaper Voucher': 'NewspaperVoucher',
	// Guardian Weekly products
	'Guardian Weekly - ROW': 'GuardianWeeklyRestOfWorld',
	'Guardian Weekly - Domestic': 'GuardianWeeklyDomestic',
	'Guardian Weekly Zone A': 'GuardianWeeklyZoneA',
	'Guardian Weekly Zone B': 'GuardianWeeklyZoneB',
	'Guardian Weekly Zone C': 'GuardianWeeklyZoneC',
	// Membership products
	Supporter: 'SupporterMembership',
	Partner: 'PartnerMembership',
	Patron: 'PatronMembership',
} as const;

export const activeProducts = [
	'SupporterPlus',
	'DigitalSubscription',
	'TierThree',
	'GuardianLight',
	'GuardianWeeklyRestOfWorld',
	'GuardianWeeklyDomestic',
	'HomeDelivery',
	'NationalDelivery',
	'SubscriptionCard',
	'Contribution',
];

const zuoraCatalogToProductRatePlanKey: Record<string, string> = {
	'Annual Contribution': 'Annual',
	'Monthly Contribution': 'Monthly',
	// Digital Pack rate plans
	'Digital Pack Monthly': 'Monthly',
	'Digital Pack Annual': 'Annual',
	'Digital Subscription One Year Fixed - One Time Charge': 'OneYearGift',
	'Digital Subscription Three Month Fixed - One Time Charge': 'ThreeMonthGift',
	// Supporter Plus rate plans
	'Supporter Plus Monthly': 'V1DeprecatedMonthly',
	'Supporter Plus Annual': 'V1DeprecatedAnnual',
	'Supporter Plus V2 - Monthly': 'Monthly',
	'Supporter Plus V2 - Annual': 'Annual',
	// Tier Three rate plans
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
	// Remove these we are not creating a new rate plan for archive benefits now
	'Supporter Plus, Guardian Weekly ROW & Archive - Monthly':
		'RestOfWorldMonthlyV2',
	'Supporter Plus, Guardian Weekly Domestic & Archive - Monthly':
		'DomesticMonthlyV2',
	'Supporter Plus, Guardian Weekly ROW & Archive - Annual':
		'RestOfWorldAnnualV2',
	'Supporter Plus, Guardian Weekly Domestic & Archive - Annual':
		'DomesticAnnualV2',
	// Current GW rate plans
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
	// Old GW rate plans
	'Guardian Weekly Annual': 'Annual',
	'Guardian Weekly Quarterly': 'Quarterly',
	// Paper rate plans
	Everyday: 'Everyday',
	Saturday: 'Saturday',
	Sunday: 'Sunday',
	Weekend: 'Weekend',
	Sixday: 'Sixday',
	// Paper+ rate plans
	'Everyday+': 'Everyday+',
	'Saturday+': 'Saturday+',
	'Sunday+': 'Sunday+',
	'Weekend+': 'Weekend+',
	'Sixday+': 'Sixday+',
	'Guardian Light Monthly': 'Monthly',
	// Membership rate plans
	'Supporter - monthly': 'V1DeprecatedMonthly',
	'Supporter - annual': 'V1DeprecatedAnnual',
	'Non Founder Supporter - monthly': 'V2DeprecatedMonthly',
	'Non Founder Supporter - annual': 'V2DeprecatedAnnual',
	'Supporter - annual (2023 Price)': 'Annual',
	'Supporter - monthly (2023 Price)': 'Monthly',
	'Non Founder Partner - monthly': 'Monthly',
	'Non Founder Partner - annual': 'Annual',
	'Partner - annual': 'V1DeprecatedAnnual',
	'Partner - monthly': 'V1DeprecatedMonthly',
	'Partner - monthly (Events)': 'V1DeprecatedMonthly',
	'Non Founder Patron - monthly': 'Monthly',
	'Non Founder Patron - annual': 'Annual',
	'Non Founder Patron Membership - Annual': 'Annual',
	'Patron - annual': 'V1DeprecatedAnnual',
	'Patron - monthly': 'V1DeprecatedMonthly',
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
	// Old GW rate plan charges
	'Zone A Annual': 'Subscription',
	'Zone A Quarterly': 'Subscription',
	'Zone B Annual': 'Subscription',
	'Zone B Quarterly': 'Subscription',
	'Zone C Annual': 'Subscription',
	'Zone C Quarterly': 'Subscription',
	Contribution: 'Contribution',
	Subscription: 'Subscription',
	Saturday: 'Saturday',
	Sunday: 'Sunday',
	Monday: 'Monday',
	Tuesday: 'Tuesday',
	Wednesday: 'Wednesday',
	Thursday: 'Thursday',
	Friday: 'Friday',
	Digipack: 'DigitalPack',
	'Digital Pack': 'DigitalPack',
	'Digital Pack bolt-on': 'DigitalPack',
	'Supporter Plus': 'SupporterPlus',
	'Guardian Weekly': 'GuardianWeekly',
	'Newspaper Archive': 'NewspaperArchive',
	'Guardian Light': 'Subscription',
	'Supporter Membership - Annual': 'Subscription',
	'Supporter Membership - Monthly': 'Subscription',
	'Partner Membership - Monthly': 'Subscription',
	'Partner Membership - Annual': 'Subscription',
	'Patron Membership - Monthly': 'Subscription',
	'Patron Membership - Annual': 'Subscription',
	'Non Founder Patron Membership - Annual': 'Subscription',
	'Non Founder Patron Membership - Monthly': 'Subscription',
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
