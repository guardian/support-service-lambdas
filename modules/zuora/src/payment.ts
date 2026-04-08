import type { Dayjs } from 'dayjs';
import { z } from 'zod';
import { voidSchema } from './types';
import { zuoraDateFormat } from './utils';
import type { ZuoraClient } from './zuoraClient';
import { getAccount } from '@modules/zuora/account';

const createPaymentRunResponseSchema = z.object({
	id: z.string(),
});

// Triggers a payment collection run for a specific account against all outstanding
// invoices up to targetDate. This is the payment equivalent of generateBillingDocuments
// and is used in the two-stage account creation flow after the payment method has been
// attached. Note: accountId is the internal Zuora account ID, not the accountNumber (e.g. A00099999).
export const createPaymentRun = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	targetDate: Dayjs,
): Promise<void> => {
	console.log(
		`Creating payment run for account ${accountNumber} with targetDate ${zuoraDateFormat(targetDate)}`,
	);
	// Annoyingly the payment run api will only work with an account id,
	// not an account number so we need to retrieve that first
	const account = await getAccount(zuoraClient, accountNumber);
	await zuoraClient.post(
		'/v1/payment-runs',
		JSON.stringify({
			accountId: account.basicInfo.id,
			targetDate: zuoraDateFormat(targetDate),
		}),
		createPaymentRunResponseSchema,
	);
};

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
	await zuoraClient.post(
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
		voidSchema,
	);
};

export const rejectPayment = async (
	zuoraClient: ZuoraClient,
	paymentNumber: string,
	rejectionReason: string = 'chargeback',
): Promise<void> => {
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

	await zuoraClient.post(path, body, voidSchema);
};
