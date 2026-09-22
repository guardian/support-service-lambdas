import { z } from 'zod';
import { executeSalesforceQueryAll } from '@modules/salesforce/query';
import type { SfClient } from '@modules/salesforce/sfClient';
import type { IdentityId } from '../schemas/identityDeletionEventSchema';

const maximumMatchingSalesforceContacts = 5;

const salesforceContactSchema = z.object({
	Id: z.string(),
});

export async function findSalesforceContactIds(
	sfClient: SfClient,
	identityId: IdentityId,
): Promise<string[]> {
	const query = `SELECT Id FROM Contact WHERE IdentityID__c = '${identityId}' LIMIT ${maximumMatchingSalesforceContacts + 1}`;
	const contacts = await executeSalesforceQueryAll(
		sfClient,
		query,
		salesforceContactSchema,
	);

	if (contacts.length > maximumMatchingSalesforceContacts) {
		throw new Error(
			`Identity ID matched more than ${maximumMatchingSalesforceContacts} Salesforce Contacts`,
		);
	}

	return contacts.map((contact) => contact.Id);
}
