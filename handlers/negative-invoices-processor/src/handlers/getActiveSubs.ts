import { stageFromEnvironment } from '@modules/stage';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';
import { BigQueryRecordSchema } from '../types';

export type ActiveSubsCheckInput = z.infer<typeof BigQueryRecordSchema>;

export const handler = async (event: ActiveSubsCheckInput) => {
	try {
		const parsedEvent = BigQueryRecordSchema.parse(event);
		// const accountId = parsedEvent.account_id;
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const hasActiveSub = await hasActiveSubscription(
			zuoraClient,
			'8ad085589739fe21019753d2da210a9d',
		);

		return {
			...parsedEvent,
			hasActiveSub,
		};
	} catch (error) {
		return {
			...event,
			subStatus: 'Error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};

const queryResponseSchema = z.object({
	size: z.number(),
});

export const hasActiveSubscription = async (
	zuoraClient: ZuoraClient,
	accountId: string,
): Promise<boolean> => {
	const query = `SELECT Id FROM Subscription WHERE AccountId = '${accountId}' AND Status = 'Active'`;
	const result = await doQuery(zuoraClient, query, queryResponseSchema);
	return result.size > 0;
};
