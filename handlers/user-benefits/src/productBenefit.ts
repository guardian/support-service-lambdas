import type { ProductKey } from '@modules/product-catalog/productCatalog';

export type ProductBenefit =
	| 'feastApp'
	| 'adFree'
	| 'newspaperArchive'
	| 'newspaperEdition'
	| 'guardianWeeklyEdition'
	| 'liveApp'
	| 'fewerSupportAsks'
	| 'rejectTracking'
	| 'liveEvents'; // Do we need this?

export const supporterPlusBenefits: ProductBenefit[] = [
	'adFree',
	'liveApp',
	'feastApp',
	'fewerSupportAsks',
	'rejectTracking',
];
export const digitalSubscriptionBenefits = supporterPlusBenefits.concat([
	'newspaperEdition',
]);
export const tierThreeBenefits = digitalSubscriptionBenefits.concat([
	'guardianWeeklyEdition',
]);

export const productBenefitMapping: Record<ProductKey, ProductBenefit[]> = {
	GuardianLight: ['rejectTracking'],
	SupporterPlus: supporterPlusBenefits,
	DigitalSubscription: digitalSubscriptionBenefits,
	TierThree: tierThreeBenefits,
	HomeDelivery: digitalSubscriptionBenefits,
	NationalDelivery: digitalSubscriptionBenefits,
	NewspaperVoucher: digitalSubscriptionBenefits,
	SubscriptionCard: digitalSubscriptionBenefits,
	SupporterMembership: ['liveApp', 'fewerSupportAsks'],
	PartnerMembership: ['liveApp', 'feastApp', 'fewerSupportAsks'],
	PatronMembership: digitalSubscriptionBenefits,
	GuardianPatron: digitalSubscriptionBenefits,
	GuardianWeeklyDomestic: ['fewerSupportAsks'],
	GuardianWeeklyRestOfWorld: ['fewerSupportAsks'],
	GuardianWeeklyZoneA: ['fewerSupportAsks'],
	GuardianWeeklyZoneB: ['fewerSupportAsks'],
	GuardianWeeklyZoneC: ['fewerSupportAsks'],
	Contribution: ['fewerSupportAsks'],
};
