import { stageFromEnvironment } from '@modules/stage';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { z } from 'zod';
import { BigQueryRecordSchema } from '../types';

export type ApplyCreditToAccountBalanceInput = z.infer<
	typeof BigQueryRecordSchema
>;

export const handler = async (event: ApplyCreditToAccountBalanceInput) => {
	try {
		const parsedEvent = BigQueryRecordSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const body = JSON.stringify({
			Amount: Math.abs(parsedEvent.invoiceBalance), //must be a positive value
			SourceTransactionNumber: parsedEvent.invoiceNumber,
			Type: 'Increase',
		});

		const applyCreditToAccountBalanceAttempt = await applyCreditToAccountBalance(zuoraClient, body);

		return {
			...parsedEvent,
			applyCreditToAccountBalanceAttempt,
		};
	} catch (error) {
		return {
			...event,
			applyCreditToAccountBalanceAttempt:{
				Success: false,
			}
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};
