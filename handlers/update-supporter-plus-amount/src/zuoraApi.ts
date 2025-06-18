import { zuoraDateFormat } from '@modules/zuora/common';
import type { OrderAction, OrderRequest } from '@modules/zuora/orders';
import { singleTriggerDate } from '@modules/zuora/orders';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import { zuoraSuccessResponseSchema } from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';

export const doUpdate = async ({
	zuoraClient,
	subscriptionNumber,
	accountNumber,
	...rest
}: {
	zuoraClient: ZuoraClient;
	shouldExtendTerm: boolean;
	subscriptionNumber: string;
	accountNumber: string;
	applyFromDate: Dayjs;
	ratePlanId: string;
	chargeNumber: string;
	contributionAmount: number;
}) => {
	const orderRequest = buildUpdateAmountRequestBody({
		subscriptionNumber,
		accountNumber,
		...rest,
	});
	const response: ZuoraSuccessResponse = await zuoraClient.post(
		'/v1/orders',
		JSON.stringify(orderRequest),
		zuoraSuccessResponseSchema,
	);
	if (!response.success) {
		const errorMessage = response.reasons?.at(0)?.message;
		throw Error(errorMessage ?? `Unknown error updating subscription`);
	}
};

const updateAmount = (
	applyFromDate: Dayjs,
	ratePlanId: string,
	chargeNumber: string,
	contributionAmount: number,
): OrderAction => ({
	type: 'UpdateProduct',
	triggerDates: singleTriggerDate(applyFromDate),
	updateProduct: {
		ratePlanId,
		chargeUpdates: [
			{
				chargeNumber,
				pricing: {
					recurringFlatFee: {
						listPrice: contributionAmount,
					},
				},
			},
		],
	},
});

const changeTermEnd = (applyFromDate: Dayjs): OrderAction => ({
	type: 'TermsAndConditions',
	triggerDates: singleTriggerDate(applyFromDate),
	termsAndConditions: {
		lastTerm: {
			termType: 'TERMED',
			endDate: zuoraDateFormat(applyFromDate),
		},
	},
});

const termRenewal = (applyFromDate: Dayjs): OrderAction => ({
	type: 'RenewSubscription',
	triggerDates: singleTriggerDate(applyFromDate),
	renewSubscription: {},
});

export const buildUpdateAmountRequestBody = ({
	applyFromDate,
	subscriptionNumber,
	accountNumber,
	ratePlanId,
	chargeNumber,
	contributionAmount,
	shouldExtendTerm,
}: {
	applyFromDate: Dayjs;
	subscriptionNumber: string;
	accountNumber: string;
	ratePlanId: string;
	chargeNumber: string;
	contributionAmount: number;
	shouldExtendTerm: boolean;
}): OrderRequest => ({
	orderDate: zuoraDateFormat(applyFromDate),
	existingAccountNumber: accountNumber,
	description: 'Update supporter plus contribution amount',
	subscriptions: [
		{
			subscriptionNumber,
			orderActions: [
				updateAmount(
					applyFromDate,
					ratePlanId,
					chargeNumber,
					contributionAmount,
				),
				changeTermEnd(applyFromDate),
				...(shouldExtendTerm ? [termRenewal(applyFromDate)] : []),
			],
		},
	],
});
