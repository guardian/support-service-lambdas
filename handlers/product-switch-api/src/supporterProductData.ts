import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import type { Dayjs } from 'dayjs';
import type { SwitchInformation } from './switchInformation';

export type ContributionAmount = { amount: number; currency: string };

export const supporterRatePlanItemFromSwitchInformation = (
	now: Dayjs,
	switchInformation: SwitchInformation,
): SupporterRatePlanItem => {
	const productRatePlanName =
		switchInformation.subscription.billingPeriod == 'Month'
			? `Supporter Plus V2 - Monthly`
			: `Supporter Plus V2 - Annual`;

	return {
		subscriptionName: switchInformation.subscription.subscriptionNumber,
		identityId: switchInformation.account.identityId,
		productRatePlanId:
			switchInformation.catalog.supporterPlus.productRatePlanId,
		productRatePlanName,
		termEndDate: now.add(1, 'year'),
		contractEffectiveDate: now,
	};
};
