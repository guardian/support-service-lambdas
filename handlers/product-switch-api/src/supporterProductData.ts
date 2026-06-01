import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import type { Dayjs } from 'dayjs';
import type { SwitchInformation } from './changePlan/prepare/switchInformation';

export type ContributionAmount = { amount: number; currency: string };

export const supporterRatePlanItemFromSwitchInformation = (
	now: Dayjs,
	switchInformation: SwitchInformation,
): SupporterRatePlanItem => {
	return {
		subscriptionName: switchInformation.subscription.subscriptionNumber,
		identityId: switchInformation.account.identityId,
		productRatePlanId: switchInformation.target.productRatePlanId,
		productRatePlanName: switchInformation.target.ratePlanName,
		termEndDate: now.add(1, 'year'),
		contractEffectiveDate: now,
	};
};
