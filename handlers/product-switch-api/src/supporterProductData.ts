import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import { SwitchInformation } from './changePlan/prepare/switchInformation';
import type { Dayjs } from 'dayjs';

export type ContributionAmount = { amount: number; currency: string };
import type { SwitchInformation } from './changePlan/prepare/switchInformation';

export const supporterRatePlanItemFromSwitchInformation = (
	now: Dayjs,
	switchInformation: SwitchInformation,
): SupporterRatePlanItem => {
	return {
		subscriptionName: switchInformation.subscription.subscriptionNumber,
		identityId: switchInformation.account.identityId,
		productRatePlanId: switchInformation.target.productRatePlanId,
		productRatePlanName: switchInformation.target.ratePlanName,
		productRatePlanId: switchInformation.target.productRatePlanId,
		productRatePlanName: switchInformation.target.ratePlanName,
		termEndDate: now.add(1, 'year'),
		contractEffectiveDate: now,
	};
};
