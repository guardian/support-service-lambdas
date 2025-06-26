// ---------- This file is auto-generated. Do not edit manually. -------------

import type { ProductKey } from '@modules/product-catalog/productCatalog';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- we are using this for type generation
const productBillingPeriods = {
	Contribution: ['Annual', 'Month'],
	DigitalSubscription: ['Quarter', 'Month', 'Annual'],
	GuardianAdLite: ['Month'],
	GuardianPatron: ['Month'],
	GuardianWeeklyDomestic: ['Annual', 'Quarter', 'Month'],
	GuardianWeeklyRestOfWorld: ['Month', 'Annual', 'Quarter'],
	GuardianWeeklyZoneA: [
		'Annual',
		'Three_Years',
		'Semi_Annual',
		'Two_Years',
		'Quarter',
	],
	GuardianWeeklyZoneB: [
		'Annual',
		'Three_Years',
		'Two_Years',
		'Semi_Annual',
		'Quarter',
	],
	GuardianWeeklyZoneC: ['Semi_Annual', 'Annual', 'Quarter'],
	HomeDelivery: ['Month'],
	NationalDelivery: ['Month'],
	NewspaperVoucher: ['Month'],
	OneTimeContribution: ['OneTime'],
	PartnerMembership: ['Annual', 'Month'],
	PatronMembership: ['Month', 'Annual'],
	SubscriptionCard: ['Month'],
	SupporterMembership: ['Annual', 'Month'],
	SupporterPlus: ['Month', 'Annual'],
	TierThree: ['Annual', 'Month'],
} as const;

export type ProductBillingPeriod<P extends ProductKey> =
	(typeof productBillingPeriods)[P][number];
