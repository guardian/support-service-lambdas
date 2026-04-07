import type { OrderAction } from '@modules/zuora/orders/orderActions';
import { singleTriggerDate } from '@modules/zuora/orders/orderActions';
import type { OrderRequest } from '@modules/zuora/orders/orderRequests';
import { voidSchema } from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Dayjs } from 'dayjs';

export const doUpdate = async ({
	zuoraClient,
	subscriptionNumber,
	accountNumber,
	...rest
}: {
	zuoraClient: ZuoraClient;
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
	await zuoraClient.post(
		'/v1/orders',
		JSON.stringify(orderRequest),
		voidSchema,
	);
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

export const buildUpdateAmountRequestBody = ({
	applyFromDate,
	subscriptionNumber,
	accountNumber,
	ratePlanId,
	chargeNumber,
	contributionAmount,
}: {
	applyFromDate: Dayjs;
	subscriptionNumber: string;
	accountNumber: string;
	ratePlanId: string;
	chargeNumber: string;
	contributionAmount: number;
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
			],
		},
	],
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
});

export const doEnsureTerm = async ({
	zuoraClient,
	subscriptionNumber,
	accountNumber,
	...rest
}: {
	zuoraClient: ZuoraClient;
	shouldExtendTerm: boolean;
	subscriptionNumber: string;
	accountNumber: string;
	today: Dayjs;
	isBrokenSub: boolean;
}) => {
	const orderRequest = buildTermRenewalRequestBody({
		subscriptionNumber,
		accountNumber,
		...rest,
	});
	if (orderRequest !== undefined) {
		await zuoraClient.post(
			'/v1/orders',
			JSON.stringify(orderRequest),
			voidSchema,
		);
	}
};

export const buildTermRenewalRequestBody = ({
	today,
	subscriptionNumber,
	accountNumber,
	shouldExtendTerm,
	isBrokenSub,
}: {
	today: Dayjs;
	subscriptionNumber: string;
	accountNumber: string;
	shouldExtendTerm: boolean;
	isBrokenSub: boolean;
}): OrderRequest | undefined => {
	const orderActions = [
		...(isBrokenSub ? [changeTermEnd(today)] : []),
		...(isBrokenSub || shouldExtendTerm ? [termRenewal(today)] : []),
	];
	if (orderActions.length == 0) {
		return undefined;
	}
	return {
		orderDate: zuoraDateFormat(today),
		existingAccountNumber: accountNumber,
		description: 'Extend term to allow future dated amount update',
		subscriptions: [
			{
				subscriptionNumber,
				orderActions,
			},
		],
	};
};
