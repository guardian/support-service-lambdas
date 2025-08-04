import { getIfDefined } from '@modules/nullAndUndefined';
import {
	creditInvoice,
	getInvoice,
	getInvoiceItems,
} from '@modules/zuora/invoice';
import { createPayment } from '@modules/zuora/payment';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type { ZuoraSwitchResponse } from './schemas';

export const adjustNonCollectedInvoice = async (
	zuoraClient: ZuoraClient,
	invoiceId: string, // this must be an id, NOT the invoice number
	paymentAmount: number,
	supporterPlusChargeId: string,
) => {
	console.log(`Writing off amount ${paymentAmount} from invoice ${invoiceId}`);
	const invoiceItems = await getInvoiceItems(zuoraClient, invoiceId);
	const supporterPlusInvoiceItem = getIfDefined(
		invoiceItems.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId === supporterPlusChargeId,
		),
		`No supporter plus invoice item found in the invoice ${invoiceId}`,
	);
	const adjustmentResult = await creditInvoice(
		dayjs(),
		zuoraClient,
		invoiceId,
		supporterPlusInvoiceItem.id,
		paymentAmount,
		'Credit',
		'InvoiceDetail',
		'Created by the product-switch-api to zero out an amount of less than 50 pence/cents as this is less than the minimum Stripe charge amount',
	);
	return adjustmentResult;
};

export const takePaymentOrAdjustInvoice = async (
	zuoraClient: ZuoraClient,
	switchResponse: ZuoraSwitchResponse,
	supporterPlusChargeId: string,
	accountId: string,
	paymentMethodId: string,
): Promise<number> => {
	const invoiceId = getIfDefined(
		switchResponse.invoiceIds?.at(0),
		'No invoice number found in the switch response',
	);

	const invoice = await getInvoice(zuoraClient, invoiceId);
	const amountPayableToday = invoice.amount;

	if (amountPayableToday === 0) {
		// Nothing to do, we don't need to take a payment and the account balance will be correct
		return 0;
	} else if (amountPayableToday < 0.5) {
		await adjustNonCollectedInvoice(
			zuoraClient,
			invoiceId,
			amountPayableToday,
			supporterPlusChargeId,
		);
		return 0;
	} else {
		await createPayment(
			zuoraClient,
			invoiceId,
			amountPayableToday,
			accountId,
			paymentMethodId,
			dayjs(),
		);
		return amountPayableToday;
	}
};
