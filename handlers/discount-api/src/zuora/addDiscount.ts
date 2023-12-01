import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from './common';
import type { ZuoraClient } from './zuoraClient';
import { zuoraSuccessResponseSchema } from './zuoraSchemas';

export const addDiscount = async (
	zuoraClient: ZuoraClient,
	subscriptionId: string,
	contractEffectiveDate: Dayjs,
	discountProductRatePlanId: string,
) => {
	const path = `/v1/subscriptions/${subscriptionId}`;
	const body = JSON.stringify({
		add: [
			{
				contractEffectiveDate: zuoraDateFormat(contractEffectiveDate),
				productRatePlanId: discountProductRatePlanId,
			},
		],
	});
	return zuoraClient.put(path, body, zuoraSuccessResponseSchema);
};
