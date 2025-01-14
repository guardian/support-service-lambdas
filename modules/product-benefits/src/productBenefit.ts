import type { ProductKey } from '@modules/product-catalog/productCatalog';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import dayjs from 'dayjs';
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
	GuardianAdLite: ['rejectTracking'],
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

const itemIsLessThanThreeMonthsOld = (item: SupporterRatePlanItem) =>
	dayjs(item.contractEffectiveDate).add(3, 'month').isAfter(dayjs());

export const itemIsValidForProduct = (
	item: SupporterRatePlanItem,
	product: ProductKey,
) => {
	if (product === 'OneTimeContribution') {
		return itemIsLessThanThreeMonthsOld(item);
	} else {
		return true;
	}
};
