import { chunkArray } from '@modules/arrayFunctions';
import { update } from '@modules/zuora/actions';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const zuoraUpdateBatchSize = 50;

export async function clearZuoraAccountIds(
	zuoraClient: ZuoraClient,
	accountIds: readonly string[],
): Promise<number> {
	let clearedAccounts = 0;

	for (const accountIdsBatch of chunkArray(accountIds, zuoraUpdateBatchSize)) {
		const results = await update(
			zuoraClient,
			JSON.stringify({
				type: 'Account',
				objects: accountIdsBatch.map((Id) => ({
					Id,
					fieldsToNull: ['IdentityId__c'],
				})),
			}),
		);

		const failedUpdates = results.filter((result) => !result.Success).length;
		if (results.length !== accountIdsBatch.length || failedUpdates > 0) {
			throw new Error(
				`Zuora did not clear the Identity ID from ${failedUpdates || accountIdsBatch.length} Customer Account record(s)`,
			);
		}

		clearedAccounts += accountIdsBatch.length;
	}

	return clearedAccounts;
}
