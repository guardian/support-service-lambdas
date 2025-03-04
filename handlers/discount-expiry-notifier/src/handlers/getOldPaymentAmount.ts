import { stageFromEnvironment } from '@modules/stage';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { InvoiceItemRecord } from '@modules/zuora/zuoraSchemas';
import type { z } from 'zod';
import { BaseRecordForEmailSendSchema } from '../types';

export type GetOldPaymentAmountInput = z.infer<
	typeof BaseRecordForEmailSendSchema
>;

export const handler = async (event: GetOldPaymentAmountInput) => {
	try {
		const parsedEvent = BaseRecordForEmailSendSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const lastPaymentDateBeforeDiscountExpiry =
			getLastPaymentDateBeforeDiscountExpiry(
				parsedEvent.firstPaymentDateAfterDiscountExpiry,
				parsedEvent.paymentFrequency,
			);
		console.log(
			'lastPaymentDateBeforeDiscountExpiry:',
			lastPaymentDateBeforeDiscountExpiry,
		);

		const getInvoiceItemsResponse = await doQuery(
			zuoraClient,
			query(
				parsedEvent.zuoraSubName,
				parsedEvent.firstPaymentDateAfterDiscountExpiry,
			),
		);
		const oldPaymentAmount = calculateTotalAmount(
			getInvoiceItemsResponse.records,
		);

		console.log('getInvoiceItemsResponse:', getInvoiceItemsResponse);
		return {
			...parsedEvent,
			lastPaymentDateBeforeDiscountExpiry,
			oldPaymentAmount,
		};
	} catch (error) {
		console.log('error:', error);
		const errorMessage =
			'Error getting old payment amount:' +
			(error instanceof Error ? error.message : JSON.stringify(error, null, 2));
		return {
			...event,
			errorDetail: errorMessage,
		};
	}
};

const calculateTotalAmount = (records: InvoiceItemRecord[]) => {
	return records.reduce(
		(total, record) => total + record.ChargeAmount + record.TaxAmount,
		0,
	);
};

const query = (subName: string, serviceStartDate: string): string =>
	`SELECT ChargeAmount, TaxAmount, ServiceStartDate, SubscriptionNumber FROM InvoiceItem WHERE SubscriptionNumber = '${subName}' AND ServiceStartDate = '${serviceStartDate}' ANDChargeName!='Delivery-problem credit' AND ChargeName!='Holiday Credit'`;

export function getLastPaymentDateBeforeDiscountExpiry(
	nextPaymentDate: string,
	paymentFrequency: string,
): string {
	const date = new Date(nextPaymentDate);

	//if the date is a leap year, set the last day of February
	if (date.getMonth() === 1 && date.getDate() === 29) {
		date.setDate(28);
	}

	switch (paymentFrequency.toLowerCase()) {
		case 'annual':
			date.setFullYear(date.getFullYear() - 1);
			break;
		case 'quarter':
			date.setMonth(date.getMonth() - 3);
			break;
		case 'month':
			date.setMonth(date.getMonth() - 1);
			break;
		default:
			throw new Error('Invalid payment frequency');
	}

	return date.toISOString().split('T')[0] ?? '';
}
