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
		console.log('event:', event);

		const parsedEvent = BaseRecordForEmailSendSchema.parse(event);
		const billingAccountId = parsedEvent.billingAccountId;
		const nextPaymentDate = parsedEvent.nextPaymentDate;
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getBillingPreviewResponse = await getBillingPreview(
			zuoraClient,
			dayjs(nextPaymentDate),
			billingAccountId,
		);

		const invoiceItemsForSubscription = filterRecordsBySubscriptionName(
			getBillingPreviewResponse.invoiceItems,
			parsedEvent.zuoraSubName,
			nextPaymentDate,
		);

		const totalChargeAmount = getTotalChargeAmount(invoiceItemsForSubscription);

		return {
			...parsedEvent,
			paymentAmount: totalChargeAmount,
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

const filterRecordsBySubscriptionName = (
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

const getTotalChargeAmount = (invoiceItems: InvoiceItem[]): number => {
	return invoiceItems.reduce((total, item) => total + item.chargeAmount, 0);
};
