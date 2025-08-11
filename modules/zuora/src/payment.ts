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
): Promise<ZuoraResponse> => {
	console.log(
		`Creating payment of ${paymentAmount} for invoice ${invoiceId}, on account ${accountId} with payment method ${paymentMethodId}`,
	);
	return await zuoraClient.post(
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
};
