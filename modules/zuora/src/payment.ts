import type { Dayjs } from 'dayjs';
import { zuoraResponseSchema } from './types';
import type { ZuoraResponse } from './types';
import { zuoraDateFormat } from './utils';
import type { ZuoraClient } from './zuoraClient';

export const createPayment = async (
	zuoraClient: ZuoraClient,
	invoiceId: string, // This is the invoice ID, not the invoice number
	paymentAmount: number,
	accountId: string, // This is the account ID, not the account number
	paymentMethodId: string,
	effectiveDate: Dayjs,
): Promise<void> => {
	console.log(
		`Creating payment of ${paymentAmount} for invoice ${invoiceId}, on account ${accountId} with payment method ${paymentMethodId}`,
	);
	const result: ZuoraResponse = await zuoraClient.post(
		'/v1/object/payment',
		JSON.stringify({
			AccountId: accountId,
			Amount: paymentAmount,
			AppliedInvoiceAmount: paymentAmount,
			AppliedCreditBalanceAmount: 0,
			EffectiveDate: zuoraDateFormat(effectiveDate),
			InvoiceId: invoiceId,
			PaymentMethodId: paymentMethodId,
			Type: 'Electronic',
			Status: 'Processed',
		}),
		zuoraResponseSchema,
	);

	if (!result.Success) {
		throw new Error('An error occurred while creating the payment');
	}
};

export const rejectPayment = async (
	zuoraClient: ZuoraClient,
	paymentNumber: string,
	rejectionReason: string = 'chargeback',
): Promise<ZuoraResponse> => {
	console.log(
		`Rejecting payment ${paymentNumber} with reason: ${rejectionReason}`,
	);
	const path = `/v1/gateway-settlement/payments/${paymentNumber}/reject`;
	const body = JSON.stringify({
		gatewayReconciliationStatus: 'payment_failed',
		gatewayReconciliationReason: rejectionReason,
		gatewayResponse: 'Payment disputed - chargeback received',
		gatewayResponseCode: '4855',
	});

	return zuoraClient.post(path, body, zuoraResponseSchema);
};
