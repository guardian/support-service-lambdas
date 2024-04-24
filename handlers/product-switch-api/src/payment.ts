import { checkDefined } from '@modules/nullAndUndefined';
import { creditInvoice, getInvoiceItems } from '@modules/zuora/invoice';
import { createPayment } from '@modules/zuora/payment';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type { ZuoraSwitchResponse } from './schemas';

const adjustNonCollectedInvoice = async (
	zuoraClient: ZuoraClient,
	invoiceId: string,
	paymentAmount: number,
	supporterPlusChargeId: string,
) => {
	console.log(`Writing off amount ${paymentAmount} from invoice ${invoiceId}`);
	const invoiceItems = await getInvoiceItems(zuoraClient, invoiceId);
	const supporterPlusInvoiceItem = checkDefined(
		invoiceItems.invoiceItems.find(
			(invoiceItem) =>
				invoiceItem.productRatePlanChargeId === supporterPlusChargeId,
		),
		`No supporter plus invoice item found in the invoice ${invoiceId}`,
	);
	const adjustmentResult = await creditInvoice(
		new Date(),
		zuoraClient,
		invoiceId,
		supporterPlusInvoiceItem.id,
		paymentAmount,
		'Created by the product-switch-api to zero out an amount of less than 50 pence/cents as this is less than the minimum Stripe charge amount',
	);
	if (!adjustmentResult.Success) {
		throw new Error('An error occurred while adjusting the invoice');
	}
	return adjustmentResult;
};

export const takePaymentOrAdjustInvoice = async (
	zuoraClient: ZuoraClient,
	switchResponse: ZuoraSwitchResponse,
	supporterPlusChargeId: string,
	accountId: string,
	paymentMethodId: string,
) => {
	if (!switchResponse.paidAmount || !switchResponse.invoiceId) {
		throw new Error('Missing paid amount or invoice ID in switch response');
	}

	if (switchResponse.paidAmount < 0.5) {
		await adjustNonCollectedInvoice(
			zuoraClient,
			switchResponse.invoiceId,
			switchResponse.paidAmount,
			supporterPlusChargeId,
		);
		return 0;
	} else {
		await createPayment(
			zuoraClient,
			switchResponse.invoiceId,
			switchResponse.paidAmount,
			accountId,
			paymentMethodId,
			dayjs(),
		);
		return switchResponse.paidAmount;
	}
};
