import type { SalesforceCredentials } from '../types';

export function buildClientCredentialsBody(
	credentials: SalesforceCredentials,
): string {
	const password = `${credentials.password}${credentials.token}`;

	return (
		`grant_type=client_credentials` +
		`&client_id=${encodeURIComponent(credentials.client_id)}` +
		`&client_secret=${encodeURIComponent(credentials.client_secret)}` +
		`&username=${encodeURIComponent(credentials.username)}` +
		`&password=${encodeURIComponent(password)}`
	);
}
