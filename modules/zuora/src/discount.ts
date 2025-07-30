import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from './utils/common';
import type { ZuoraClient } from './zuoraClient';
import type { AddDiscountPreview, ZuoraSuccessResponse } from './zuoraSchemas';
import {
	addDiscountPreviewSchema,
	zuoraSuccessResponseSchema,
} from './zuoraSchemas';

export const addDiscount = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	termStartDate: Dayjs,
	termEndDate: Dayjs,
	contractEffectiveDate: Dayjs,
	discountProductRatePlanId: string,
): Promise<ZuoraSuccessResponse> => {
	// If the next billing date is outside the current term, we will need to extend it as you can't add a rate plan
	// after the end of the current term. As digital subscriptions have their customer acceptance date (when first
	// payment is taken therefore billing date) 14 days after the contract effective date (acquisition date/when the
	// term begins) to provide a free trial period, for annual subs the next billing date is going to be outside the
	// current term.
	const newTermLengthIfRequired = getNewTermLengthIfRequired(
		termStartDate,
		termEndDate,
		contractEffectiveDate,
	);
	const path = `/v1/subscriptions/${subscriptionNumber}`;
	const body = JSON.stringify({
		add: [
			{
				contractEffectiveDate: zuoraDateFormat(contractEffectiveDate),
				productRatePlanId: discountProductRatePlanId,
			},
		],
		...newTermLengthIfRequired,
	});
	return zuoraClient.put(path, body, zuoraSuccessResponseSchema);
};

export const getNewTermLengthIfRequired = (
	termStartDate: Dayjs,
	termEndDate: Dayjs,
	nextBillingDate: Dayjs,
) => {
	if (nextBillingDate.isAfter(termEndDate)) {
		return {
			currentTerm: nextBillingDate.diff(termStartDate, 'day'),
			currentTermPeriodType: 'Day',
		};
	}
	return {};
};

export const previewDiscount = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
	contractEffectiveDate: Dayjs,
	discountProductRatePlanId: string,
): Promise<AddDiscountPreview> => {
	const path = `/v1/subscriptions/${subscriptionNumber}`;
	const body = JSON.stringify({
		add: [
			{
				contractEffectiveDate: zuoraDateFormat(contractEffectiveDate),
				productRatePlanId: discountProductRatePlanId,
			},
		],
		// Set to 24 months because you can't preview adding product rate plan after the end of the current term
		// and as digital subscriptions have their customer acceptance date (when payment is taken therefore billing date)
		// 14 days after the contract effective date (acquisition date/when the term begins) to provide a free
		// trial period, for annual subs in particular the next billing date is going to be outside the current term.
		currentTerm: 24,
		currentTermPeriodType: 'Month',
		preview: 'true',
		invoiceTargetDate: zuoraDateFormat(contractEffectiveDate),
	});
	return zuoraClient.put(path, body, addDiscountPreviewSchema);
};
