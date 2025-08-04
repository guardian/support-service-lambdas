import { stageFromEnvironment } from '@modules/stage';
import { doRefund } from '@modules/zuora/refund';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import {
	DoCreditBalanceRefundInputSchema,
	RefundResponseSchema,
} from '../types';
import type {
	DoCreditBalanceRefundInput,
	DoCreditBalanceRefundOutput,
	PaymentMethod,
} from '../types';

export const handler = async (
	event: DoCreditBalanceRefundInput,
): Promise<DoCreditBalanceRefundOutput> => {
	let paymentMethodToRefundTo: PaymentMethod | undefined;

	try {
		const parsedEvent = DoCreditBalanceRefundInputSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		paymentMethodToRefundTo = getPaymentMethodToRefundTo(
			parsedEvent.activePaymentMethodResult.activePaymentMethods ?? [],
		);
		if (!paymentMethodToRefundTo) {
			throw new Error('No active payment method found to refund to.');
		}

		const refundAmount = Math.abs(parsedEvent.invoiceBalance);
		const body = JSON.stringify({
			AccountId: parsedEvent.accountId,
			Amount: refundAmount,
			SourceType: 'CreditBalance',
			Type: 'External',
			RefundDate: dayjs().format('YYYY-MM-DD'), //today
			MethodType: paymentMethodToRefundTo.type,
		});

		await doRefund(zuoraClient, body);

		return {
			...parsedEvent,
			refundResult: {
				paymentMethod: paymentMethodToRefundTo,
				refundAmount,
			},
		};
	} catch (error) {
		const abc = {
			...event,
			refundResult: {
				error:
					error instanceof Error
						? error.message
						: JSON.stringify(error, null, 2),
			},
		};
		console.log('Error in doCreditBalanceRefund handler:', abc);
		// Return the error in the refund
		return abc;
	}
};

function getPaymentMethodToRefundTo(paymentMethods: PaymentMethod[]) {
	const defaultMethod = paymentMethods.find((pm) => pm.isDefault);
	return defaultMethod ?? paymentMethods[0];
}
