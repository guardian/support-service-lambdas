import { stageFromEnvironment } from '@modules/stage';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';

export const CheckForActiveSubSchema = z.object({
	invoiceId: z.string(),
	accountId: z.string(),
	invoiceNumber: z.string(),
	invoiceBalance: z.number(),
});
export type CheckForActiveSubInput = z.infer<typeof CheckForActiveSubSchema>;

export const handler = async (event: CheckForActiveSubInput) => {
	try {
		const parsedEvent = CheckForActiveSubSchema.parse(event);
		const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
		const hasActiveSub = await hasActiveSubscription(
			zuoraClient,
			parsedEvent.accountId,
		);

		return {
			...parsedEvent,
			hasActiveSub,
		};
	} catch (error) {
		return {
			...event,
			subStatus: 'Error', //rethink this name
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
	accountId: string,
): Promise<boolean> => {
	const query = `SELECT Id FROM Subscription WHERE AccountId = '${accountId}' AND Status = 'Active'`;
	const result = await doQuery(zuoraClient, query, queryResponseSchema);
	return result.size > 0;
};
