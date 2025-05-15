// ---------- This file is auto-generated. Do not edit manually. -------------

import type { ProductKey } from '@modules/product-catalog/productCatalog';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- we are using this for type generation
const productBillingPeriods = {
	GuardianWeeklyRestOfWorld: ['Month', 'Annual', 'Quarter'],
	GuardianAdLite: ['Month'],
	TierThree: ['Annual', 'Month'],
	DigitalSubscription: ['Quarter', 'Month', 'Annual'],
	NationalDelivery: ['Month'],
	SupporterMembership: ['Annual', 'Month'],
	SupporterPlus: ['Month', 'Annual'],
	GuardianWeeklyDomestic: ['Annual', 'Quarter', 'Month'],
	SubscriptionCard: ['Month'],
	Contribution: ['Annual', 'Month'],
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
	NewspaperVoucher: ['Month'],
	HomeDelivery: ['Month'],
	PatronMembership: ['Month', 'Annual'],
	PartnerMembership: ['Annual', 'Month'],
	GuardianPatron: ['Month'],
	OneTimeContribution: ['OneTime'],
} as const;

export type ProductBillingPeriod<P extends ProductKey> =
	(typeof productBillingPeriods)[P][number];
