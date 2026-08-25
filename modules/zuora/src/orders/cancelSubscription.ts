import type { Dayjs } from 'dayjs';
import { getInvoice } from '@modules/zuora/invoice';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createOrderAsynchronously } from './asyncOrderRequests';
import type { CancelSubscriptionOrderAction } from './orderActions';
import type { CreateOrderRequest } from './orderRequests';

export type CancellationOrderInput = {
	accountNumber: string;
	subscriptionNumber: string;
	orderDate: Dayjs;
	cancellationEffectiveDate: Dayjs;
};

const cancellationAction = (
	cancellationEffectiveDate: Dayjs,
): CancelSubscriptionOrderAction => {
	const effectiveDate = zuoraDateFormat(cancellationEffectiveDate);
	return {
		type: 'CancelSubscription',
		triggerDates: [
			{
				name: 'ContractEffective',
				triggerDate: effectiveDate,
			},
		],
		cancelSubscription: {
			cancellationPolicy: 'SpecificDate',
			cancellationEffectiveDate: effectiveDate,
		},
	};
};

export const buildCancellationOrderRequest = (
	input: CancellationOrderInput,
): CreateOrderRequest => ({
	orderDate: zuoraDateFormat(input.orderDate),
	existingAccountNumber: input.accountNumber,
	subscriptions: [
		{
			subscriptionNumber: input.subscriptionNumber,
			orderActions: [cancellationAction(input.cancellationEffectiveDate)],
		},
	],
	processingOptions: {
		runBilling: true,
		collectPayment: false,
	},
});

export const zeroOrOneInvoiceNumber = (
	invoiceNumbers: string[] | undefined,
): string | undefined => {
	if (invoiceNumbers === undefined || invoiceNumbers.length === 0) {
		return undefined;
	}
	if (invoiceNumbers.length > 1) {
		throw new Error(
			'Zuora generated more than one invoice for a single subscription cancellation',
		);
	}
	return invoiceNumbers[0];
};

export const cancelSubscriptionWithOrder = async (
	zuoraClient: ZuoraClient,
	input: CancellationOrderInput,
	maximumDurationInMilliseconds: number,
	idempotencyKey: string,
): Promise<string | undefined> => {
	const orderResult = await createOrderAsynchronously(
		zuoraClient,
		buildCancellationOrderRequest(input),
		maximumDurationInMilliseconds,
		{ idempotencyKey },
	);
	const invoiceNumber = zeroOrOneInvoiceNumber(orderResult.invoiceNumbers);
	return invoiceNumber === undefined
		? undefined
		: (await getInvoice(zuoraClient, invoiceNumber)).id;
};
