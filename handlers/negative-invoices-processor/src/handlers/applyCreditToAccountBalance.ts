import { stageFromEnvironment } from '@modules/stage';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';

export const ApplyCreditToAccountBalanceInputSchema = z.object({
	invoiceId: z.string(),
	accountId: z.string(),
	invoiceNumber: z.string(),
	invoiceBalance: z.number(),
	hasActiveSub: z.boolean(),
	hasActivePaymentMethod: z.boolean().optional(),
});

export type ApplyCreditToAccountBalanceInput = z.infer<
	typeof ApplyCreditToAccountBalanceInputSchema
>;

export const handler = async (event: ApplyCreditToAccountBalanceInput) => {
	try {
		const parsedEvent = ApplyCreditToAccountBalanceInputSchema.parse(event);
		console.log('ApplyCreditToAccountBalance parsedEvent', parsedEvent);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const body = JSON.stringify({
			Amount: parsedEvent.invoiceBalance,
			SourceTransactionNumber: parsedEvent.invoiceNumber,
			Type: 'Increase',
			Comment: 'a comment',
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
