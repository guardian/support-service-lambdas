import type { SalesforceCredentials } from '../types';

/**
 * Builds URL-encoded form body for Salesforce OAuth client credentials request
 *
 * @param credentials - Salesforce OAuth credentials
 * @returns URL-encoded string for the request body
 */
export function buildClientCredentialsBody(
	credentials: SalesforceCredentials,
): string {
	return (
		`grant_type=client_credentials` +
		`&client_id=${encodeURIComponent(credentials.client_id)}` +
		`&client_secret=${encodeURIComponent(credentials.client_secret)}`
	);
}
