import { objectQuery } from '@modules/zuora/objectQuery';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { MAXIMUM_MATCHING_RECORDS_PER_IDENTITY } from '../constants';
import type { IdentityId } from '../schemas/identityDeletionEventSchema';

export async function findZuoraAccountIds(
	zuoraClient: ZuoraClient,
	identityId: IdentityId,
): Promise<string[]> {
	const page = await objectQuery.accounts.execute(
		zuoraClient,
		['id'],
		[],
		[{ field: 'IdentityId__c', operator: 'EQ', value: identityId }],
		MAXIMUM_MATCHING_RECORDS_PER_IDENTITY + 1,
	);

	if (
		page.data.length > MAXIMUM_MATCHING_RECORDS_PER_IDENTITY ||
		page.nextPage !== null
	) {
		throw new Error(
			`Identity ID matched more than ${MAXIMUM_MATCHING_RECORDS_PER_IDENTITY} Zuora Accounts`,
		);
	}

	return page.data.map((account) => account.id);
}
