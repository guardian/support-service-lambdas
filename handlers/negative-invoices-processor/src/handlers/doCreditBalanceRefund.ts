import { stageFromEnvironment } from '@modules/stage';
import { doCreditBalanceRefund } from '@modules/zuora/doCreditBalanceRefund';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { z } from 'zod';

export const DoCreditBalanceRefundSchema = z.object({
	invoiceId: z.string(),
	accountId: z.string(),
	invoiceNumber: z.string(),
	invoiceBalance: z.number(),
	hasActiveSub: z.boolean(),
	hasActivePaymentMethod: z.boolean().optional(),
});

export type DoCreditBalanceRefund = z.infer<typeof DoCreditBalanceRefundSchema>;

export const handler = async (event: DoCreditBalanceRefund) => {
	try {
		const parsedEvent = DoCreditBalanceRefundSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());

		const body = JSON.stringify({
			AccountId: '8ad0855183f1cbdd0183f499fc0c047e',
			Amount: 1.0,
			SourceType: 'CreditBalance',
			Type: 'External',
			RefundDate: dayjs().format('YYYY-MM-DD'), //today
			MethodType: 'CreditCardReferenceTransaction', //get this from the payment method
		});

		const creditBalanceRefundAttempt = await doCreditBalanceRefund(
			zuoraClient,
			body,
		);

		return {
			...parsedEvent,
			creditBalanceRefundAttempt,
		};
	} catch (error) {
		return {
			...event,
			applyCreditToAccountBalanceStatus: 'Error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};
