import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import { SwitchInformation } from './changePlan/prepare/switchInformation';

export const supporterRatePlanItemFromSwitchInformation = (
	switchInformation: SwitchInformation,
): SupporterRatePlanItem => {
	return {
		subscriptionName: switchInformation.subscription.subscriptionNumber,
		identityId: switchInformation.account.identityId,
		productRatePlanId: switchInformation.target.productRatePlanId,
		productRatePlanName: switchInformation.target.ratePlanName,
		termEndDate: zuoraDateFormat(dayjs().add(1, 'year')),
		contractEffectiveDate: zuoraDateFormat(dayjs()),
	};
};
