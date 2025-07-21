import { stageFromEnvironment } from '@modules/stage';
import { doRefund } from '@modules/zuora/refund';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { PaymentMethod } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import { DoCreditBalanceRefundInputSchema } from '../types';
import type {
	DoCreditBalanceRefundInput,
	DoCreditBalanceRefundOutput,
} from '../types';
import { RefundResponseSchema } from '../types/shared/refund';

export const handler = async (
	event: DoCreditBalanceRefundInput,
): Promise<DoCreditBalanceRefundOutput> => {
	let paymentMethodToRefundTo: PaymentMethod | undefined;

	try {
		const parsedEvent = DoCreditBalanceRefundInputSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		paymentMethodToRefundTo = getPaymentMethodToRefundTo(
			parsedEvent.checkForActivePaymentMethodAttempt.activePaymentMethods ?? [],
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

		const response = await doRefund(zuoraClient, body, RefundResponseSchema);

		return {
			...parsedEvent,
			refundAttempt: {
				...response,
				// paymentMethod: paymentMethodToRefundTo,
				// paymentMethod: {
				// 	id: 'aaa',
				// 	status: 'active',
				// 	type: 'credit_card',
				// 	isDefault: true,
				// },
				// refundAmount,
			},
		};
	} catch (error) {
		return {
			...event,
			refundAttempt: {
				Success: false,
				// paymentMethod: paymentMethodToRefundTo,
				// error:
				// 	error instanceof Error
				// 		? error.message
				// 		: JSON.stringify(error, null, 2),
			},
		};
	}
};

function getPaymentMethodToRefundTo(paymentMethods: PaymentMethod[]) {
	const defaultMethod = paymentMethods.find((pm) => pm.isDefault);
	return defaultMethod ?? paymentMethods[0];
}
