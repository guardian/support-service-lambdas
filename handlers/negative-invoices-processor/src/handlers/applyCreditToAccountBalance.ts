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
			Amount: 67.79,
			Comment: 'a comment',
			SourceTransactionNumber: 'INV00124038',
			Type: 'Increase',
		});
		// callout is working. Start with tidying up the type and figure out how to get invoice item id (from query maybe?)
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
