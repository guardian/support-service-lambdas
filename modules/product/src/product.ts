export const products = [
	'DigitalSubscription',
	'Newspaper',
	'GuardianWeekly',
	'SupporterPlus',
	'Contribution',
] as const;
export type Product = (typeof products)[number];

// --------------- Delivery Options ---------------
export const newspaperDeliveryOptions = [
	'HomeDelivery',
	'NationalDelivery',
	'SubscriptionCard',
] as const;
export type NewspaperDeliveryOption = (typeof newspaperDeliveryOptions)[number];
export const guardianWeeklyDeliveryOptions = [
	'RestOfWorld',
	'Domestic',
] as const;
export type GuardianWeeklyDeliveryOption =
	(typeof guardianWeeklyDeliveryOptions)[number];
export type DigitalDeliveryOption = 'Digital';
export type DeliveryOption<T extends Product> = T extends 'DigitalSubscription'
	? DigitalDeliveryOption
	: T extends 'Newspaper'
	  ? NewspaperDeliveryOption
	  : T extends 'GuardianWeekly'
	    ? GuardianWeeklyDeliveryOption
	    : T extends 'SupporterPlus'
	      ? DigitalDeliveryOption
	      : T extends 'Contribution'
	        ? DigitalDeliveryOption
	        : never;

// --------------- Product Options ---------------
export const guardianWeeklyProductOptions = [
	'Monthly',
	'Annual',
	'Quarterly',
	'SixWeekly',
	'OneYearGift',
	'ThreeMonthGift',
] as const;
export type GuardianWeeklyProductOption =
	(typeof guardianWeeklyProductOptions)[number];
export const newspaperProductOptions = [
	'Saturday',
	'Sunday',
	'Weekend',
	'Sixday',
	'Everyday',
] as const;
export type NewspaperProductOption = (typeof newspaperProductOptions)[number];
export const digitalSubscriptionProductOptions = [
	'Monthly',
	'Annual',
	'OneYearGift',
	'ThreeMonthGift',
] as const;
export type DigitalSubscriptionProductOption =
	(typeof digitalSubscriptionProductOptions)[number];
export const supporterPlusProductOptions = ['Monthly', 'Annual'] as const;
export type SupporterPlusProductOption =
	(typeof supporterPlusProductOptions)[number];
export const contributionProductOptions = ['Monthly', 'Annual'] as const;
export type ContributionProductOption =
	(typeof contributionProductOptions)[number];
export type ProductOption<T extends Product> = T extends 'DigitalSubscription'
	? DigitalSubscriptionProductOption
	: T extends 'Newspaper'
	  ? NewspaperProductOption
	  : T extends 'GuardianWeekly'
	    ? GuardianWeeklyProductOption
	    : T extends 'SupporterPlus'
	      ? SupporterPlusProductOption
	      : T extends 'Contribution'
	        ? ContributionProductOption
	        : never;

// --------------- Charges ---------------
export type SubscriptionCharge = 'Subscription';
export type ContributionCharge = 'Contribution';
export type SupporterPlusCharges = SubscriptionCharge | ContributionCharge;
export type NewspaperCharges =
	| 'Monday'
	| 'Tuesday'
	| 'Wednesday'
	| 'Thursday'
	| 'Friday'
	| 'Saturday'
	| 'Sunday';
export type ProductCharge<T extends Product> = T extends 'DigitalSubscription'
	? SubscriptionCharge
	: T extends 'Newspaper'
	  ? NewspaperCharges
	  : T extends 'GuardianWeekly'
	    ? SubscriptionCharge
	    : T extends 'SupporterPlus'
	      ? SupporterPlusCharges
	      : T extends 'Contribution'
	        ? ContributionCharge
	        : never;

export type ProductDetails = {
	product: Product;
	deliveryOption: DeliveryOption<Product>;
	productOption: ProductOption<Product>;
	productRatePlanId: string;
};
export const getDeliveryOptionsForProduct = (product: Product) => {
	switch (product) {
		case 'DigitalSubscription':
		case 'SupporterPlus':
		case 'Contribution':
			return ['Digital'] as const;
		case 'Newspaper':
			return newspaperDeliveryOptions;
		case 'GuardianWeekly':
			return guardianWeeklyDeliveryOptions;
	}
};

export const getProductOptionsForProduct = (product: Product) => {
	switch (product) {
		case 'DigitalSubscription':
			return digitalSubscriptionProductOptions;
		case 'Newspaper':
			return newspaperProductOptions;
		case 'GuardianWeekly':
			return guardianWeeklyProductOptions;
		case 'SupporterPlus':
			return supporterPlusProductOptions;
		case 'Contribution':
			return contributionProductOptions;
	}
};
