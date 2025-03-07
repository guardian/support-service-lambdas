import { stageFromEnvironment } from '@modules/stage';
import { getBillingPreview } from '@modules/zuora/billingPreview';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { BillingPreviewInvoiceItem } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import type { z } from 'zod';
import { BaseRecordForEmailSendSchema } from '../types';

export type GetNewPaymentAmountInput = z.infer<
	typeof BaseRecordForEmailSendSchema
>;

export const handler = async (event: GetNewPaymentAmountInput) => {
	try {
		const parsedEvent = BaseRecordForEmailSendSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getBillingPreviewResponse = await getBillingPreview(
			zuoraClient,
			dayjs(parsedEvent.firstPaymentDateAfterDiscountExpiry),
			parsedEvent.billingAccountId,
		);
		const invoiceItemsForSubscription = filterRecords(
			getBillingPreviewResponse.invoiceItems,
			parsedEvent.zuoraSubName,
			parsedEvent.firstPaymentDateAfterDiscountExpiry,
		);
		const newPaymentAmount = getNewPaymentAmount(invoiceItemsForSubscription);

		return {
			...parsedEvent,
			newPaymentAmount,
		};
	} catch (error) {
		console.log('error:', error);
		const errorMessage =
			'Error getting new payment amount:' +
			(error instanceof Error ? error.message : JSON.stringify(error, null, 2));
		return {
			...event,
			errorDetail: errorMessage,
		};
	}
};

const filterRecords = (
	invoiceItems: BillingPreviewInvoiceItem[],
	subscriptionNumber: string,
	firstPaymentDateAfterDiscountExpiry: string,
): BillingPreviewInvoiceItem[] => {
	return invoiceItems.filter(
		(item) =>
			item.subscriptionNumber === subscriptionNumber &&
			dayjs(item.serviceStartDate).isSame(
				dayjs(firstPaymentDateAfterDiscountExpiry),
				'day',
			),
	);
};

const getNewPaymentAmount = (
	invoiceItems: BillingPreviewInvoiceItem[],
): number => {
	return invoiceItems.reduce(
		(total, record) => total + record.chargeAmount + record.taxAmount,
		0,
	);
};
