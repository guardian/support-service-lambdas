import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import type { TargetInformation } from './changePlan/targetInformation';
import { AccountInformation } from './changePlan/accountInformation';
import { SubscriptionInformation } from './changePlan/subscriptionInformation';

export type ContributionAmount = { amount: number; currency: string };

export const supporterRatePlanItemFromSwitchInformation = (
	targetInformation: TargetInformation,
	accountInformation: AccountInformation,
	subscriptionInformation: SubscriptionInformation,
): SupporterRatePlanItem => {
	// const productRatePlanName =
	// 	subscriptionInformation.productRatePlanKey == 'Month'
	// 		? `Supporter Plus V2 - Monthly`
	// 		: `Supporter Plus V2 - Annual`;

	return {
		subscriptionName: subscriptionInformation.subscriptionNumber,
		identityId: accountInformation.identityId,
		productRatePlanId: targetInformation.productRatePlanId,
		productRatePlanName: targetInformation.ratePlanName,
		termEndDate: zuoraDateFormat(dayjs().add(1, 'year')),
		contractEffectiveDate: zuoraDateFormat(dayjs()),
	};
};
