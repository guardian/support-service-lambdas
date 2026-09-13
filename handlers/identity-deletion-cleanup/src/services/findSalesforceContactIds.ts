import { z } from 'zod';
import { executeSalesforceQueryAll } from '@modules/salesforce/query';
import type { SfClient } from '@modules/salesforce/sfClient';

const salesforceContactSchema = z.object({
	Id: z.string(),
});

export async function findSalesforceContactIds(
	sfClient: SfClient,
	identityId: string,
): Promise<string[]> {
	const query = `SELECT Id FROM Contact WHERE IdentityID__c = '${identityId}'`;
	const contacts = await executeSalesforceQueryAll(
		sfClient,
		query,
		salesforceContactSchema,
	);

	return contacts.map((contact) => contact.Id);
}
