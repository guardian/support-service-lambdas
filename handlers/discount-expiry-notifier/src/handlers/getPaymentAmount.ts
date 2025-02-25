import { stageFromEnvironment } from '@modules/stage';
import { getBillingPreview } from '@modules/zuora/billingPreview';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { InvoiceItem } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import type { z } from 'zod';
import { BaseRecordForEmailSendSchema } from '../types';

export type GetPaymentAmountInput = z.infer<
	typeof BaseRecordForEmailSendSchema
>;

export const handler = async (event: GetPaymentAmountInput) => {
	try {
		const parsedEvent = BaseRecordForEmailSendSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getBillingPreviewResponse = await getBillingPreview(
			zuoraClient,
			dayjs(parsedEvent.nextPaymentDate),
			parsedEvent.billingAccountId,
		);
		const invoiceItemsForSubscription = filterRecords(
			getBillingPreviewResponse.invoiceItems,
			parsedEvent.zuoraSubName,
			parsedEvent.nextPaymentDate,
		);
		const paymentAmount = getPaymentAmount(invoiceItemsForSubscription);

		return {
			...parsedEvent,
			paymentAmount,
		};
	} catch (error) {
		console.log('error:', error);

		return {
			...event,
			subStatus: 'Error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};

const filterRecords = (
	invoiceItems: InvoiceItem[],
	subscriptionName: string,
	nextPaymentDate: string,
): InvoiceItem[] => {
	return invoiceItems.filter(
		(item) =>
			item.subscriptionName === subscriptionName &&
			dayjs(item.serviceStartDate).isSame(dayjs(nextPaymentDate), 'day'),
	);
};

const getPaymentAmount = (invoiceItems: InvoiceItem[]): number => {
	return invoiceItems.reduce((total, item) => total + item.chargeAmount, 0);
};
