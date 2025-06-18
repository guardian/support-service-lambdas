import { stageFromEnvironment } from '@modules/stage';
import { getBillingPreview } from '@modules/zuora/billingPreview';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type { z } from 'zod';
import { calculateTotalAmount, filterRecords } from '../helpers';
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
		const invoiceItems = filterRecords(
			getBillingPreviewResponse.invoiceItems,
			parsedEvent.zuoraSubName,
			parsedEvent.firstPaymentDateAfterDiscountExpiry,
		);
		const newPaymentAmount = calculateTotalAmount(invoiceItems);

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
