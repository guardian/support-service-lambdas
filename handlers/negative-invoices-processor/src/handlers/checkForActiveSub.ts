import { stageFromEnvironment } from '@modules/stage';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { CheckForActiveSubInputSchema } from '../types';
import type { CheckForActiveSubInput, CheckForActiveSubOutput } from '../types';
import { queryBaseResponseSchema } from '@modules/zuora/types/httpResponse';

export const handler = async (
	event: CheckForActiveSubInput,
): Promise<CheckForActiveSubOutput> => {
	try {
		const parsedEvent = CheckForActiveSubInputSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());

		const hasActiveSub = await hasActiveSubscription(
			zuoraClient,
			parsedEvent.accountId,
		);
		return {
			...parsedEvent,
			activeSubResult: {
				checkForActiveSubAttempt: {
					Success: true,
				},
				hasActiveSubscription: hasActiveSub,
			},
		};
	} catch (error) {
		return {
			...event,
			activeSubResult: {
				checkForActiveSubAttempt: {
					Success: false,
				},
				hasActiveSubscription: undefined,
				error:
					error instanceof Error
						? error.message
						: JSON.stringify(error, null, 2),
			},
		};
	}
};

export const hasActiveSubscription = async (
	zuoraClient: ZuoraClient,
	accountId: string,
): Promise<boolean> => {
	const query = `SELECT Id FROM Subscription WHERE AccountId = '${accountId}' AND Status = 'Active'`;
	const result = await doQuery(zuoraClient, query, queryBaseResponseSchema);
	return result.size > 0;
};
