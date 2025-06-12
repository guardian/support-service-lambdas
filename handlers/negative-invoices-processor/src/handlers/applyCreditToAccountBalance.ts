import { stageFromEnvironment } from '@modules/stage';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';

export const ApplyCreditToAccountBalanceInputSchema = z.object({
	accountId: z.string(),
	// creditAmount: z.number(),
});

export type ApplyCreditToAccountBalanceInput = z.infer<
	typeof ApplyCreditToAccountBalanceInputSchema
>;

export const handler = async (event: ApplyCreditToAccountBalanceInput) => {
	try {
		// const parsedEvent = ApplyCreditToAccountBalanceInputSchema.parse(event);
		// console.log('Parsed event:', parsedEvent);
		console.log('event:', event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const body = JSON.stringify({
			Amount: 1,
			Type: 'Credit',
			AdjustmentDate: '2025-06-10',
			InvoiceNumber: 'INV01548159',
			SourceType: 'InvoiceDetail',
			SourceId: '8ad085519749e9180197583679444747',
		});
		// callout is working. Start with tidying up the type and figure out how to get invoice item id (from query maybe?)
		const attempt = await applyCreditToAccountBalance(zuoraClient, body);

		return {
			...event,
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
