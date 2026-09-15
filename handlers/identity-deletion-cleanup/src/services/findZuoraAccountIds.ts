import { z } from 'zod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const zuoraAccountsPageSchema = z.object({
	nextPage: z.string().nullable(),
	data: z.array(
		z.object({
			id: z.string(),
		}),
	),
});

export async function findZuoraAccountIds(
	zuoraClient: ZuoraClient,
	identityId: string,
): Promise<string[]> {
	const accountIds: string[] = [];
	const seenCursors = new Set<string>();
	let cursor: string | undefined;

	do {
		const query = new URLSearchParams();
		query.set('pageSize', '99');
		query.append('fields[]', 'id');
		query.append('filter[]', `IdentityId__c.EQ:${identityId}`);
		query.set('includeNullFields', 'true');
		if (cursor !== undefined) {
			query.set('cursor', cursor);
		}

		const page = await zuoraClient.get(
			'/object-query/accounts',
			zuoraAccountsPageSchema,
			query,
		);

		accountIds.push(...page.data.map((account) => account.id));
		cursor = page.nextPage ?? undefined;

		if (cursor !== undefined) {
			if (seenCursors.has(cursor)) {
				throw new Error('Zuora account query returned a repeated page cursor');
			}
			seenCursors.add(cursor);
		}
	} while (cursor !== undefined);

	return accountIds;
}
