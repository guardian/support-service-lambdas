import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '../../../src/zuora/common';

export const updateSubscriptionBody = (
	contractEffectiveDate: Dayjs,
	ratePlanId: string,
) => {
	return {
		add: [
			{
				contractEffectiveDate: `${zuoraDateFormat(contractEffectiveDate)}`,
				productRatePlanId: '2c92c0f84bbfec8b014bc655f4852d9d',
			},
		],
		remove: [
			{
				contractEffectiveDate: `${zuoraDateFormat(contractEffectiveDate)}`,
				ratePlanId,
			},
		],
	};
};
