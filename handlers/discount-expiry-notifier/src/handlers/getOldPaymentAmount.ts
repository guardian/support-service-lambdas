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
		const getInvoiceItemsResponse = await doQuery(
			zuoraClient,
			query('A-S00424163', '2025-02-22'),
		);
		const oldPaymentAmount = calculateTotalAmount(
			getInvoiceItemsResponse.records,
		);

		console.log('getInvoiceItemsResponse:', getInvoiceItemsResponse);
		return {
			...parsedEvent,
			oldPaymentAmount,
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

const calculateTotalAmount = (records: InvoiceItemRecord[]) => {
	return records.reduce(
		(total, record) => total + record.ChargeAmount + record.TaxAmount,
		0,
	);
};

const query = (subName: string, serviceStartDate: string): string =>
	`
	SELECT 
		ChargeAmount, 
		TaxAmount, 
		ServiceStartDate, 
		SubscriptionNumber 
	FROM 
		InvoiceItem 
	WHERE 
		SubscriptionNumber = '${subName}' AND 
		ServiceStartDate = '${serviceStartDate}' AND
		ChargeName!='Delivery-problem credit' AND 
		ChargeName!='Holiday Credit'
	`;
