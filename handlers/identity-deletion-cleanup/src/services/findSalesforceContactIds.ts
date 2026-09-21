import { z } from 'zod';
import { executeSalesforceQueryAll } from '@modules/salesforce/query';
import type { SfClient } from '@modules/salesforce/sfClient';
import { MAXIMUM_MATCHING_RECORDS_PER_IDENTITY } from '../constants';
import type { IdentityId } from '../schemas/identityDeletionEventSchema';

const salesforceContactSchema = z.object({
	Id: z.string(),
});

export async function findSalesforceContactIds(
	sfClient: SfClient,
	identityId: IdentityId,
): Promise<string[]> {
	const query = `SELECT Id FROM Contact WHERE IdentityID__c = '${identityId}' LIMIT ${MAXIMUM_MATCHING_RECORDS_PER_IDENTITY + 1}`;
	const contacts = await executeSalesforceQueryAll(
		sfClient,
		query,
		salesforceContactSchema,
	);

	if (contacts.length > MAXIMUM_MATCHING_RECORDS_PER_IDENTITY) {
		throw new Error(
			`Identity ID matched more than ${MAXIMUM_MATCHING_RECORDS_PER_IDENTITY} Salesforce Contacts`,
		);
	}

	return contacts.map((contact) => contact.Id);
}
