import { stageFromEnvironment } from '@modules/stage';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { InvoiceSchema } from '../types';
import type {
	ApplyCreditToAccountBalanceInput,
	ApplyCreditToAccountBalanceOutput,
} from '../types';

export const handler = async (
	event: ApplyCreditToAccountBalanceInput,
): Promise<ApplyCreditToAccountBalanceOutput> => {
	try {
		const parsedEvent = InvoiceSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const body = JSON.stringify({
			Amount: Math.abs(parsedEvent.invoiceBalance), //must be a positive value
			SourceTransactionNumber: parsedEvent.invoiceNumber,
			Type: 'Increase',
		});

		const applyCreditToAccountBalanceAttempt =
			await applyCreditToAccountBalance(zuoraClient, body);
		console.log(
			`applyCreditToAccountBalanceAttempt: ${JSON.stringify(
				applyCreditToAccountBalanceAttempt,
				null,
				2,
			)}`,
		);
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
