import { stageFromEnvironment } from '@modules/stage';
import { applyCreditToAccountBalance } from '@modules/zuora/creditBalanceAdjustment';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	ApplyCreditToAccountBalanceResponseSchema,
	InvoiceSchema,
} from '../types';
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

		const response = await applyCreditToAccountBalance(
			zuoraClient,
			body,
			ApplyCreditToAccountBalanceResponseSchema,
		);

		return {
			...parsedEvent,
			applyCreditToAccountBalanceResult: {
				creditBalanceAdjustmentId: response.Id,
			},
		};
	} catch (error) {
		return {
			...event,
			applyCreditToAccountBalanceResult: {
				error:
					error instanceof Error
						? error.message
						: JSON.stringify(error, null, 2),
			},
		};
	}
};
