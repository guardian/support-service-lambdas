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
			accountId: event.accountId,
			reasonCode: 'Credit',
			amount: 1,
			type: 'Credit',
		});

		console.log('body:', body);

		const attempt = await applyCreditToAccountBalance(zuoraClient, body);
		console.log('Attempt to apply credit:', attempt);

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
