import { stageFromEnvironment } from '@modules/stage';
import { getBillingPreview } from '@modules/zuora/billingPreview';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type { z } from 'zod';
import { BigQueryRecordSchema } from '../types';
import type { BaseRecordForEmailSendSchema } from '../types';

export type GetPaymentAmountInput = z.infer<
	typeof BaseRecordForEmailSendSchema
>;

export const handler = async (event: GetPaymentAmountInput) => {
	try {
		const parsedEvent = BigQueryRecordSchema.parse(event);
		const billingAccountId = parsedEvent.billingAccountId;
		const nextPaymentDate = parsedEvent.nextPaymentDate;
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const getBillingPreviewResponse = await getBillingPreview(
			zuoraClient,
			dayjs(nextPaymentDate),
			billingAccountId,
		);
		console.log('getBillingPreviewResponse:', getBillingPreviewResponse);
		return {
			...parsedEvent,
		};
	} catch (error) {
		return {
			...event,
			subStatus: 'Error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};
