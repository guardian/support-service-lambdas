/**
 * Tests zuora-secrets integration
 *
 * @group integration
 */

import { BearerTokenProvider } from '../src/zuora/bearerTokenProvider';
import { getCredentials } from '../src/zuora/zuoraCredentials';

test('getZuoraCredentials', async () => {
	const credentials = await getCredentials('CODE');
	expect(credentials.clientSecret.length).toBeGreaterThan(0);
});

test('getBearerToken', async () => {
	const credentials = await getCredentials('CODE');
	const provider: BearerTokenProvider = new BearerTokenProvider(
		'CODE',
		credentials,
	);
	const token = await provider.getBearerToken();
	expect(token.access_token.length).toBeGreaterThan(0);
});
