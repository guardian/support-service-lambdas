// ---------- This file is auto-generated. Do not edit manually. -------------

import type { ProductKey } from '@modules/product-catalog/productCatalog';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- we are using this for type generation
const productBillingPeriods = {
	Contribution: ['Annual', 'Month'],
	DigitalSubscription: ['Annual', 'Month', 'Quarter'],
	GuardianAdLite: ['Month'],
	GuardianPatron: ['Month'],
	GuardianWeeklyDomestic: ['Annual', 'Month', 'Quarter'],
	GuardianWeeklyRestOfWorld: ['Annual', 'Month', 'Quarter'],
	GuardianWeeklyZoneA: [
		'Annual',
		'Quarter',
		'Semi_Annual',
		'Three_Years',
		'Two_Years',
	],
	GuardianWeeklyZoneB: [
		'Annual',
		'Quarter',
		'Semi_Annual',
		'Three_Years',
		'Two_Years',
	],
	GuardianWeeklyZoneC: ['Annual', 'Quarter', 'Semi_Annual'],
	HomeDelivery: ['Month'],
	NationalDelivery: ['Month'],
	NewspaperVoucher: ['Month'],
	OneTimeContribution: ['OneTime'],
	PartnerMembership: ['Annual', 'Month'],
	PatronMembership: ['Annual', 'Month'],
	SubscriptionCard: ['Month'],
	SupporterMembership: ['Annual', 'Month'],
	SupporterPlus: ['Annual', 'Month'],
	TierThree: ['Annual', 'Month'],
} as const;

export type ProductBillingPeriod<P extends ProductKey> =
	(typeof productBillingPeriods)[P][number];
