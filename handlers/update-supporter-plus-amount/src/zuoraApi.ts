import { singleTriggerDate } from '@modules/zuora/orders/orderActions';
import type { OrderRequest } from '@modules/zuora/orders/orderRequests';
import type { ZuoraResponse } from '@modules/zuora/types';
import { zuoraResponseSchema } from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Dayjs } from 'dayjs';

export const doUpdate = async ({
	zuoraClient,
	newTermStartDate,
	subscriptionNumber,
	accountNumber,
	...rest
}: {
	zuoraClient: ZuoraClient;
	newTermStartDate?: Dayjs;
	subscriptionNumber: string;
	accountNumber: string;
	applyFromDate: Dayjs;
	ratePlanId: string;
	chargeNumber: string;
	contributionAmount: number;
}) => {
	if (newTermStartDate !== undefined) {
		// We have to do the new term and the update amount requests
		// separately because the order dates are different
		await doCreateOrderRequest(
			zuoraClient,
			buildNewTermRequestBody(
				newTermStartDate,
				subscriptionNumber,
				accountNumber,
			),
			'starting new term',
		);
	}
	await doCreateOrderRequest(
		zuoraClient,
		buildUpdateAmountRequestBody({
			subscriptionNumber,
			accountNumber,
			...rest,
		}),
		'updating subscription',
	);
};

const doCreateOrderRequest = async (
	zuoraClient: ZuoraClient,
	body: OrderRequest,
	context: string,
) => {
	const response: ZuoraResponse = await zuoraClient.post(
		'/v1/orders',
		JSON.stringify(body),
		zuoraResponseSchema,
	);
	if (!response.success) {
		const errorMessage = response.reasons?.at(0)?.message;
		throw Error(errorMessage ?? `Unknown error ${context}`);
	}
};

export const buildNewTermRequestBody = (
	newTermStartDate: Dayjs,
	subscriptionNumber: string,
	accountNumber: string,
): OrderRequest => {
	return {
		orderDate: zuoraDateFormat(newTermStartDate),
		existingAccountNumber: accountNumber,
		description: 'Renewed the subscription during supporter plus amount update',
		subscriptions: [
			{
				subscriptionNumber,
				orderActions: [
					{
						type: 'TermsAndConditions',
						triggerDates: singleTriggerDate(newTermStartDate),
						termsAndConditions: {
							lastTerm: {
								termType: 'TERMED',
								endDate: zuoraDateFormat(newTermStartDate),
							},
						},
					},
					{
						type: 'RenewSubscription',
						triggerDates: singleTriggerDate(newTermStartDate),
					},
				],
			},
		],
	};
};

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
}): OrderRequest => {
	return {
		orderDate: zuoraDateFormat(applyFromDate),
		existingAccountNumber: accountNumber,
		description: 'Update supporter plus contribution amount',
		subscriptions: [
			{
				subscriptionNumber,
				orderActions: [
					{
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
					},
				],
			},
		],
	};
};
