import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraUpperCaseSuccessResponse } from '@modules/zuora/zuoraSchemas';
import { zuoraUpperCaseSuccessResponseSchema } from '@modules/zuora/zuoraSchemas';

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
	const result: ZuoraUpperCaseSuccessResponse = await zuoraClient.post(
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
		zuoraUpperCaseSuccessResponseSchema,
	);

	if (!result.Success) {
		throw new Error('An error occurred while creating the payment');
	}
};
