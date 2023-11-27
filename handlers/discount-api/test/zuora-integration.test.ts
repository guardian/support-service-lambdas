/**
 * Tests zuora-secrets integration
 *
 * @group integration
 */

import { fetchZuoraBearerToken } from '../src/zuora-api';
import { getCredentials } from '../src/zuora-credentials';

test('getZuoraCredentials', async () => {
	const credentials = await getCredentials('CODE');
	expect(credentials.clientSecret.length).toBeGreaterThan(0);
});

test('getBearerToken', async () => {
	const credentials = await getCredentials('CODE');
	const token = await fetchZuoraBearerToken('CODE', credentials);
	expect(token.access_token.length).toBeGreaterThan(0);
});
