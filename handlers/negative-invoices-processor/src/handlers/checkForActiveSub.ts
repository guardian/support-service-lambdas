import { stageFromEnvironment } from '@modules/stage';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';
import { BigQueryRecordSchema } from '../types';

export type CheckForActiveSubInput = z.infer<typeof BigQueryRecordSchema>;

export const handler = async (event: CheckForActiveSubInput) => {
	try {
		const parsedEvent = BigQueryRecordSchema.parse(event);
		const accountId = parsedEvent.account_id;
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const query = `SELECT Id FROM Subscription WHERE AccountId = '${accountId}' AND Status = 'Active'`;
		console.log('Querying Zuora for active subscription:', query);
		const hasActiveSub = await hasActiveSubscription(zuoraClient, query);

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
	done: z.boolean(),
	size: z.number(),
});

export const hasActiveSubscription = async (
	zuoraClient: ZuoraClient,
	query: string,
): Promise<boolean> => {
	const result = await doQuery(zuoraClient, query, queryResponseSchema);
	return result.size > 0;
};
