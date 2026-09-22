import { chunkArray } from '@modules/arrayFunctions';
import { sfApiVersion } from '@modules/salesforce/config';
import type { SfClient } from '@modules/salesforce/sfClient';
import { doCompositeCallout } from '@modules/salesforce/updateRecords';

const salesforceCompositeUpdateBatchSize = 200;

export async function clearSalesforceContactIds(
	sfClient: SfClient,
	contactIds: readonly string[],
): Promise<number> {
	let clearedContacts = 0;

	for (const contactIdsBatch of chunkArray(
		contactIds,
		salesforceCompositeUpdateBatchSize,
	)) {
		const results = await doCompositeCallout(
			sfClient,
			`/services/data/${sfApiVersion()}/composite/sobjects`,
			{
				allOrNone: false,
				records: contactIdsBatch.map((Id) => ({
					attributes: { type: 'Contact' },
					Id,
					IdentityID__c: null,
				})),
			},
		);

		const failedUpdates = results.filter((result) => !result.success).length;
		if (results.length !== contactIdsBatch.length || failedUpdates > 0) {
			throw new Error(
				`Salesforce did not clear the Identity ID from ${failedUpdates || contactIdsBatch.length} Contact record(s)`,
			);
		}

		clearedContacts += contactIdsBatch.length;
	}

	return clearedContacts;
}
