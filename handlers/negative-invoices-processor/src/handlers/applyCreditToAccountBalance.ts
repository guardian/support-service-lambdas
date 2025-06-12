import { stageFromEnvironment } from '@modules/stage';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';

export const ApplyCreditToAccountBalanceInputSchema = z.object({
	accountId: z.string(),
	creditAmount: z.number(),
});

export type ApplyCreditToAccountBalanceInput = z.infer<
	typeof ApplyCreditToAccountBalanceInputSchema
>;

export const handler = async (event: ApplyCreditToAccountBalanceInput) => {
	try {
		const parsedEvent = ApplyCreditToAccountBalanceInputSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const body = JSON.stringify({
			accountId: parsedEvent.accountId,
			reasonCode: 'Credit',
			items: [
				{
					amount: 1,
					sourceType: 'External',
					description: 'Manual credit',
				},
			],
		});
		const attempt = await applyCreditToAccountBalance(zuoraClient, body);
		console.log('Attempt to apply credit:', attempt);

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
