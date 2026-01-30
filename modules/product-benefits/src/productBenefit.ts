import type { ProductKey } from '@modules/product-catalog/productCatalog';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import dayjs from 'dayjs';
import type { InAppPurchaseProductKey } from '@modules/product-benefits/inAppPurchase';
import type { ProductBenefit } from './schemas';
import { productBenefitListSchema } from './schemas';

export const allProductBenefits: ProductBenefit[] =
	productBenefitListSchema.options;

export const supporterPlusBenefits: ProductBenefit[] = [
	'adFree',
	'liveApp',
	'feastApp',
	'hideSupportMessaging',
	'allowRejectAll',
];
export const digitalSubscriptionBenefits = supporterPlusBenefits.concat([
	'newspaperEdition',
	'guardianWeeklyEdition',
	'newspaperArchive',
]);

export const productBenefitMapping: Record<
	ProductKey | InAppPurchaseProductKey,
	ProductBenefit[]
> = {
	GuardianAdLite: ['allowRejectAll'],
	SupporterPlus: supporterPlusBenefits,
	DigitalSubscription: digitalSubscriptionBenefits,
	TierThree: digitalSubscriptionBenefits,
	HomeDelivery: digitalSubscriptionBenefits,
	NationalDelivery: digitalSubscriptionBenefits,
	NewspaperVoucher: digitalSubscriptionBenefits,
	SubscriptionCard: digitalSubscriptionBenefits,
	SupporterMembership: ['liveApp', 'feastApp', 'hideSupportMessaging'],
	PartnerMembership: ['liveApp', 'feastApp', 'hideSupportMessaging'],
	PatronMembership: digitalSubscriptionBenefits,
	GuardianPatron: digitalSubscriptionBenefits,
	GuardianWeeklyDomestic: ['hideSupportMessaging'],
	GuardianWeeklyRestOfWorld: ['hideSupportMessaging'],
	GuardianWeeklyZoneA: ['hideSupportMessaging'],
	GuardianWeeklyZoneB: ['hideSupportMessaging'],
	GuardianWeeklyZoneC: ['hideSupportMessaging'],
	Contribution: ['hideSupportMessaging'],
	OneTimeContribution: ['hideSupportMessaging'],
	InAppPurchase: ['hideSupportMessaging'],
};

const itemIsLessThanThreeMonthsOld = (item: SupporterRatePlanItem) =>
	item.contractEffectiveDate.add(3, 'month').isAfter(dayjs());

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
