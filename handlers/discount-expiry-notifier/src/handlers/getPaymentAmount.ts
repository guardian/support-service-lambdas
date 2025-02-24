import { stageFromEnvironment } from '@modules/stage';
import { getBillingPreview } from '@modules/zuora/billingPreview';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
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
		console.log('parsedEvent:', parsedEvent);
		const billingAccountId = parsedEvent.billingAccountId;
		console.log('billingAccountId:', billingAccountId);
		const nextPaymentDate = parsedEvent.nextPaymentDate;
		console.log('nextPaymentDate:', nextPaymentDate);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		console.log('zuoraClient:', zuoraClient);
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
