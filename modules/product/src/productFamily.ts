export const productFamilies = [
	'DigitalSubscription',
	'Newspaper',
	'GuardianWeekly',
	'SupporterPlus',
	'Contribution',
] as const;
export type ProductFamily = (typeof productFamilies)[number];

// --------------- Zuora Products ---------------
export const newspaperZuoraProducts = [
	'HomeDelivery',
	'NationalDelivery',
	'SubscriptionCard',
] as const;
export type NewspaperZuoraProduct = (typeof newspaperZuoraProducts)[number];
export const guardianWeeklyZuoraProducts = ['RestOfWorld', 'Domestic'] as const;
export type GuardianWeeklyZuoraProduct =
	(typeof guardianWeeklyZuoraProducts)[number];
export const digitalSubscriptionZuoraProduct = 'DigitalSubscription';
export type DigitalSubscriptionZuoraProduct =
	typeof digitalSubscriptionZuoraProduct;

export const supporterPlusZuoraProduct = 'SupporterPlus';
export type SupporterPlusZuoraProduct = typeof supporterPlusZuoraProduct;
export const contributionZuoraProduct = 'Contribution';
export type ContributionZuoraProduct = typeof contributionZuoraProduct;

export type ZuoraProduct<T extends ProductFamily> =
	T extends 'DigitalSubscription'
		? DigitalSubscriptionZuoraProduct
		: T extends 'Newspaper'
		  ? NewspaperZuoraProduct
		  : T extends 'GuardianWeekly'
		    ? GuardianWeeklyZuoraProduct
		    : T extends 'SupporterPlus'
		      ? SupporterPlusZuoraProduct
		      : T extends 'Contribution'
		        ? ContributionZuoraProduct
		        : never;

// --------------- Product Rate Plans ---------------
export const guardianWeeklyProductRatePlans = [
	'Monthly',
	'Annual',
	'Quarterly',
	'SixWeekly',
	'OneYearGift',
	'ThreeMonthGift',
] as const;
export type GuardianWeeklyProductRatePlan =
	(typeof guardianWeeklyProductRatePlans)[number];
export const newspaperProductRatePlans = [
	'Saturday',
	'Sunday',
	'Weekend',
	'Sixday',
	'Everyday',
] as const;
export type NewspaperProductRatePlan =
	(typeof newspaperProductRatePlans)[number];
export const digitalSubscriptionProductRatePlans = [
	'Monthly',
	'Annual',
	'OneYearGift',
	'ThreeMonthGift',
] as const;
export type DigitalSubscriptionProductRatePlan =
	(typeof digitalSubscriptionProductRatePlans)[number];
export const supporterPlusProductRatePlans = ['Monthly', 'Annual'] as const;
export type SupporterPlusProductRatePlan =
	(typeof supporterPlusProductRatePlans)[number];
export const contributionProductRatePlans = ['Monthly', 'Annual'] as const;
export type ContributionProductRatePlan =
	(typeof contributionProductRatePlans)[number];
export type ProductRatePlan<T extends ProductFamily> =
	T extends 'DigitalSubscription'
		? DigitalSubscriptionProductRatePlan
		: T extends 'Newspaper'
		  ? NewspaperProductRatePlan
		  : T extends 'GuardianWeekly'
		    ? GuardianWeeklyProductRatePlan
		    : T extends 'SupporterPlus'
		      ? SupporterPlusProductRatePlan
		      : T extends 'Contribution'
		        ? ContributionProductRatePlan
		        : never;

export type ProductDetails = {
	productFamily: ProductFamily;
	zuoraProduct: ZuoraProduct<ProductFamily>;
	productRatePlan: ProductRatePlan<ProductFamily>;
	productRatePlanId: string;
};

export const zuoraProductsForProductFamily: {
	[P in ProductFamily]: ReadonlyArray<ZuoraProduct<P>>;
} = {
	DigitalSubscription: [digitalSubscriptionZuoraProduct],
	Newspaper: newspaperZuoraProducts,
	GuardianWeekly: guardianWeeklyZuoraProducts,
	SupporterPlus: [supporterPlusZuoraProduct],
	Contribution: [contributionZuoraProduct],
};

export const productRatePlansForProductFamily: {
	[P in ProductFamily]: ReadonlyArray<ProductRatePlan<P>>;
} = {
	DigitalSubscription: digitalSubscriptionProductRatePlans,
	Newspaper: newspaperProductRatePlans,
	GuardianWeekly: guardianWeeklyProductRatePlans,
	SupporterPlus: supporterPlusProductRatePlans,
	Contribution: contributionProductRatePlans,
};
