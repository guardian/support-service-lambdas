import type { ProductKey } from '@modules/product-catalog/productCatalog';
import type { ProductBenefit } from './schemas';
import { productBenefitListSchema } from './schemas';

export const allProductBenefits: ProductBenefit[] =
	productBenefitListSchema.options;

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
	'newspaperArchive',
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
	OneTimeContribution: ['fewerSupportAsks'],
};
