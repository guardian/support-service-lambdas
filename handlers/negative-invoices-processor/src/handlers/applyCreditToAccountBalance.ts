import { stageFromEnvironment } from '@modules/stage';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { validateInput } from '@modules/validation/index';
import { ApplyCreditToAccountBalanceInputSchema } from '../types';
import type {
	ApplyCreditToAccountBalanceInput,
	ApplyCreditToAccountBalanceOutput,
} from '../types';

export const handler = async (
	event: ApplyCreditToAccountBalanceInput,
): Promise<ApplyCreditToAccountBalanceOutput> => {
	try {
		const parsedEvent = validateInput(
			event,
			ApplyCreditToAccountBalanceInputSchema,
			'Error parsing event to type: ApplyCreditToAccountBalanceInput',
		);

		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const body = JSON.stringify({
			Amount: Math.abs(parsedEvent.invoiceBalance), //must be a positive value
			SourceTransactionNumber: parsedEvent.invoiceNumber,
			Type: 'Increase',
		});

		const applyCreditToAccountBalanceAttempt =
			await applyCreditToAccountBalance(zuoraClient, body);

		return {
			...parsedEvent,
			applyCreditToAccountBalanceAttempt,
		};
	} catch (error) {
		return {
			...event,
			applyCreditToAccountBalanceAttempt: {
				Success: false,
				error:
					error instanceof Error
						? error.message
						: JSON.stringify(error, null, 2),
			},
		};
	}
};
