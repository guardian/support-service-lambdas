import { stageFromEnvironment } from '@modules/stage';
import { doCreditBalanceRefund } from '@modules/zuora/doCreditBalanceRefund';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
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
			AccountId: '8ad0855183f1cbdd0183f499fc0c047e', // Replace with actual Account ID
			TotalAmount: 1,
			SourceType: 'CreditBalance',
			Type: 'Electronic',
			PaymentMethodId: '8ad0855183f1cbdd0183f499fbea047d', // Replace with actual PaymentMethodId (if electronic)
			RefundDate: '2025-06-17', // Replace with actual date (if external)
		});

		const attempt = await doCreditBalanceRefund(zuoraClient, body);

		return {
			...parsedEvent,
			attempt,
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
