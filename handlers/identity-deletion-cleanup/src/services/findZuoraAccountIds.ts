import { objectQuery } from '@modules/zuora/objectQuery';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { IdentityId } from '../schemas/identityDeletionEventSchema';

const maximumMatchingZuoraAccounts = 50;

export async function findZuoraAccountIds(
	zuoraClient: ZuoraClient,
	identityId: IdentityId,
): Promise<string[]> {
	const page = await objectQuery.accounts.execute(
		zuoraClient,
		['id'],
		[],
		[{ field: 'IdentityId__c', operator: 'EQ', value: identityId }],
		maximumMatchingZuoraAccounts + 1,
	);

	if (
		page.data.length > maximumMatchingZuoraAccounts ||
		page.nextPage !== null
	) {
		throw new Error(
			`Identity ID matched more than ${maximumMatchingZuoraAccounts} Zuora Accounts`,
		);
	}

	return page.data.map((account) => account.id);
}
