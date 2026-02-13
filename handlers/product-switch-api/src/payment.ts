import { getIfDefined } from '@modules/nullAndUndefined';
import {
	creditInvoice,
	getInvoice,
	getInvoiceItems,
} from '@modules/zuora/invoice';
import { createPayment } from '@modules/zuora/payment';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';

export const adjustNonCollectedInvoice = async (
	zuoraClient: ZuoraClient,
	invoiceId: string, // this must be an id, NOT the invoice number
	paymentAmount: number,
	subscriptionChargeId: string,
) => {
	console.log(`Writing off amount ${paymentAmount} from invoice ${invoiceId}`);
	const invoiceItems = await getInvoiceItems(zuoraClient, invoiceId);
	const supporterPlusInvoiceItem = getIfDefined(
		invoiceItems.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId === subscriptionChargeId,
		),
		`No supporter plus invoice item (id: ${subscriptionChargeId} ) found in the invoice ${invoiceId}`,
	);
	return await creditInvoice(
		dayjs(),
		zuoraClient,
		invoiceId,
		supporterPlusInvoiceItem.id,
		paymentAmount,
		'Credit',
		'InvoiceDetail',
		'Created by the product-switch-api to zero out an amount of less than 50 pence/cents as this is less than the minimum Stripe charge amount',
	);
};

export const takePaymentOrAdjustInvoice = async (
	zuoraClient: ZuoraClient,
	invoiceId: string,
	subscriptionChargeId: string,
	accountId: string,
	paymentMethodId: string,
): Promise<number> => {
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
			subscriptionChargeId,
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
