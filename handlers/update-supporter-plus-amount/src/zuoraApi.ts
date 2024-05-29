import { zuoraDateFormat } from '@modules/zuora/common';
import type {
	OrderAction,
	OrderRequest,
	UpdateProductOrderAction,
} from '@modules/zuora/orders';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import { zuoraSuccessResponseSchema } from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';

export const doUpdate = async ({
	zuoraClient,
	...rest
}: {
	zuoraClient: ZuoraClient;
	applyFromDate: Dayjs;
	newTermStartDate?: Dayjs;
	subscriptionNumber: string;
	accountNumber: string;
	ratePlanId: string;
	chargeNumber: string;
	contributionAmount: number;
}) => {
	const requestBody = buildRequestBody(rest);
	const response: ZuoraSuccessResponse = await zuoraClient.post(
		'/v1/orders',
		JSON.stringify(requestBody),
		zuoraSuccessResponseSchema,
	);
	if (!response.success) {
		const errorMessage = response.reasons?.at(0)?.message;
		throw Error(errorMessage ?? `Unknown error updating subscription`);
	}
};

const buildUpdateProductOrderAction = (
	applyFromDate: Dayjs,
	ratePlanId: string,
	chargeNumber: string,
	contributionAmount: number,
): UpdateProductOrderAction => {
	return {
		type: 'UpdateProduct',
		triggerDates: [
			{
				name: 'ContractEffective',
				triggerDate: zuoraDateFormat(applyFromDate),
			},
			{
				name: 'ServiceActivation',
				triggerDate: zuoraDateFormat(applyFromDate),
			},
			{
				name: 'CustomerAcceptance',
				triggerDate: zuoraDateFormat(applyFromDate),
			},
		],
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
	};
};

export const buildRequestBody = ({
	applyFromDate,
	newTermStartDate,
	subscriptionNumber,
	accountNumber,
	ratePlanId,
	chargeNumber,
	contributionAmount,
}: {
	applyFromDate: Dayjs;
	newTermStartDate?: Dayjs;
	subscriptionNumber: string;
	accountNumber: string;
	ratePlanId: string;
	chargeNumber: string;
	contributionAmount: number;
}): OrderRequest => {
	const newTermOrderActions: OrderAction[] =
		newTermStartDate !== undefined
			? [
					{
						type: 'TermsAndConditions',
						triggerDates: [
							{
								name: 'ContractEffective',
								triggerDate: zuoraDateFormat(newTermStartDate),
							},
							{
								name: 'ServiceActivation',
								triggerDate: zuoraDateFormat(newTermStartDate),
							},
							{
								name: 'CustomerAcceptance',
								triggerDate: zuoraDateFormat(newTermStartDate),
							},
						],
						termsAndConditions: {
							lastTerm: {
								termType: 'TERMED',
								endDate: zuoraDateFormat(newTermStartDate),
							},
						},
					},
					{
						type: 'RenewSubscription',
						triggerDates: [
							{
								name: 'ContractEffective',
								triggerDate: zuoraDateFormat(newTermStartDate),
							},
							{
								name: 'ServiceActivation',
								triggerDate: zuoraDateFormat(newTermStartDate),
							},
							{
								name: 'CustomerAcceptance',
								triggerDate: zuoraDateFormat(newTermStartDate),
							},
						],
						renewSubscription: {},
					},
				]
			: [];

	return {
		orderDate: zuoraDateFormat(applyFromDate),
		existingAccountNumber: accountNumber,

		subscriptions: [
			{
				subscriptionNumber,
				orderActions: [
					...newTermOrderActions,
					buildUpdateProductOrderAction(
						applyFromDate,
						ratePlanId,
						chargeNumber,
						contributionAmount,
					),
				],
			},
		],
	};
};
