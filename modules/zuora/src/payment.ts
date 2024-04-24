import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import { zuoraSuccessResponseSchema } from '@modules/zuora/zuoraSchemas';

export const createPayment = async (
	zuoraClient: ZuoraClient,
	invoiceId: string,
	paymentAmount: number,
	accountId: string,
	paymentMethodId: string,
	effectiveDate: Dayjs,
): Promise<void> => {
	console.log(
		`Creating payment of ${paymentAmount} for invoice ${invoiceId}, on account ${accountId} with payment method ${paymentMethodId}`,
	);
	const result: ZuoraSuccessResponse = await zuoraClient.post(
		'/v1/object/payment',
		JSON.stringify({
			AccountId: accountId,
			Amount: paymentAmount,
			EffectiveDate: zuoraDateFormat(effectiveDate),
			InvoiceId: invoiceId,
			PaymentMethodId: paymentMethodId,
		}),
		zuoraSuccessResponseSchema,
	);

	if (!result.success) {
		throw new Error('An error occurred while creating the payment');
	}
};
