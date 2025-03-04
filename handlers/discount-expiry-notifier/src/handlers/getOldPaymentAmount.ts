import { stageFromEnvironment } from '@modules/stage';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { InvoiceItemRecord } from '@modules/zuora/zuoraSchemas';
import type { z } from 'zod';
import { BaseRecordForEmailSendSchema } from '../types';

export type GetOldPaymentAmountInput = z.infer<
	typeof BaseRecordForEmailSendSchema
>;
const calculateTotalAmount = (records: InvoiceItemRecord[]) => {
	return records.reduce(
		(total, record) => total + record.ChargeAmount + record.TaxAmount,
		0,
	);
};
export const handler = async (event: GetOldPaymentAmountInput) => {
	try {
		const parsedEvent = BaseRecordForEmailSendSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getInvoiceItemsResponse = await doQuery(zuoraClient);
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
