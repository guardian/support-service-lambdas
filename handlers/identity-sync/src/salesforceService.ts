import { logger } from '@modules/routing/logger';
import type { SfClient } from '@modules/salesforce/sfClient';
import { z } from 'zod';

const SALESFORCE_API_VERSION = '58.0';

/**
 * Schema for Salesforce PATCH response
 */
const sfPatchResponseSchema = z.unknown();

/**
 * Updates the IdentityID__c field on a Salesforce Contact
 *
 * Uses the Salesforce REST API to PATCH the Contact record.
 * The field name is IdentityID__c (note: different casing from Zuora's IdentityId__c)
 */
export const updateSalesforceContactIdentityId = async (
	sfClient: SfClient,
	contactId: string,
	identityId: string,
): Promise<void> => {
	const path = `/services/data/v${SALESFORCE_API_VERSION}/sobjects/Contact/${contactId}`;
	const payload = {
		IdentityID__c: identityId,
	};
	const body = JSON.stringify(payload);

	logger.log(
		`Updating Salesforce Contact ${contactId} with IdentityID__c: ${identityId}`,
	);

	// Salesforce PATCH returns 204 No Content on success
	await sfClient.patch(path, body, sfPatchResponseSchema);

	logger.log(`Successfully updated Salesforce Contact ${contactId}`);
};

/**
 * Schema for Salesforce Contact response
 */
const sfContactSchema = z.object({
	Id: z.string(),
	IdentityID__c: z.string().nullable().optional(),
});

type SfContact = z.infer<typeof sfContactSchema>;

/**
 * Gets the current IdentityID__c value from a Salesforce Contact
 */
export const getSalesforceContactIdentityId = async (
	sfClient: SfClient,
	contactId: string,
): Promise<string | null> => {
	const path = `/services/data/v${SALESFORCE_API_VERSION}/sobjects/Contact/${contactId}`;

	try {
		const response: SfContact = await sfClient.get(path, sfContactSchema);
		return response.IdentityID__c ?? null;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.log(`Error fetching Salesforce Contact ${contactId}: ${errorMessage}`);
		throw error;
	}
};

/**
 * Checks if the Salesforce Contact ID format is valid
 * Salesforce IDs are 15 or 18 characters
 */
export const isValidSalesforceContactId = (contactId: string): boolean => {
	return /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(contactId);
};
