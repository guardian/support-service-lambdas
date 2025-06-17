import { stageFromEnvironment } from '@modules/stage';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
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
			accountId: parsedEvent.accountId,
			amount: 1, //Math.abs(parsedEvent.invoiceBalance),
			comment: 'Refund from credit balance',
			type: 'External', // or "Electronic"
			reasonCode: 'CustomerRequest',
		});

		const attempt = await applyCreditToAccountBalance(zuoraClient, body);

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
