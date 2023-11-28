import type { Dayjs } from 'dayjs';

export const updateSubscriptionBody = (
	contractEffectiveDate: Dayjs,
	ratePlanId: string,
) => {
	return {
		add: [
			{
				contractEffectiveDate: `${contractEffectiveDate.format('YYYY-MM-DD')}`,
				productRatePlanId: '2c92c0f84bbfec8b014bc655f4852d9d',
			},
		],
		remove: [
			{
				contractEffectiveDate: `${contractEffectiveDate.format('YYYY-MM-DD')}`,
				ratePlanId,
			},
		],
	};
};
