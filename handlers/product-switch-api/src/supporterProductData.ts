import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import type { SwitchInformation } from './changePlan/switchInformation';

export type ContributionAmount = { amount: number; currency: string };

export const supporterRatePlanItemFromSwitchInformation = (
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
			switchInformation.catalog.targetProduct.productRatePlanId,
		productRatePlanName,
		termEndDate: zuoraDateFormat(dayjs().add(1, 'year')),
		contractEffectiveDate: zuoraDateFormat(dayjs()),
	};
};
