import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from './common';
import type { ZuoraClient } from './zuoraClient';
import {
	addDiscountPreviewSchema,
	zuoraSuccessResponseSchema,
} from './zuoraSchemas';

export const addDiscount = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	contractEffectiveDate: Dayjs,
	discountProductRatePlanId: string,
) => {
	const path = `/v1/subscriptions/${subscriptionNumber}`;
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

export const previewDiscount = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	contractEffectiveDate: Dayjs,
	discountProductRatePlanId: string,
) => {
	const path = `/v1/subscriptions/${subscriptionNumber}`;
	const body = JSON.stringify({
		add: [
			{
				contractEffectiveDate: zuoraDateFormat(contractEffectiveDate),
				productRatePlanId: discountProductRatePlanId,
			},
		],
		preview: 'true',
		invoiceTargetDate: zuoraDateFormat(contractEffectiveDate),
	});
	return zuoraClient.put(path, body, addDiscountPreviewSchema);
};
