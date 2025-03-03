import { stageFromEnvironment } from '@modules/stage';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { InvoiceItem } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import type { z } from 'zod';
import { BaseRecordForEmailSendSchema } from '../types';

export type GetOldPaymentAmountInput = z.infer<
	typeof BaseRecordForEmailSendSchema
>;

export const handler = async (event: GetOldPaymentAmountInput) => {
	try {
		const parsedEvent = BaseRecordForEmailSendSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getInvoiceItemsResponse = await doQuery(zuoraClient);
		console.log('getInvoiceItemsResponse:', getInvoiceItemsResponse);
		return {
			...parsedEvent,
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

const getNewPaymentAmount = (invoiceItems: InvoiceItem[]): number => {
	return invoiceItems.reduce((total, item) => total + item.paymentAmount, 0);
};
