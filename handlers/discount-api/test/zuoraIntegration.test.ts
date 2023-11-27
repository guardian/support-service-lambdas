/**
 * Tests zuora-secrets integration
 *
 * @group integration
 */

import { BearerTokenProvider } from '../src/zuora/bearerTokenProvider';
import { GetSubscription } from '../src/zuora/getSubscription';
import { getOAuthClientCredentials } from '../src/zuora/oAuthCredentials';

test('getZuoraCredentials', async () => {
	const credentials = await getOAuthClientCredentials('CODE');
	expect(credentials.clientSecret.length).toBeGreaterThan(0);
});

test('BearerTokeProvider', async () => {
	const credentials = await getOAuthClientCredentials('CODE');
	const provider: BearerTokenProvider = new BearerTokenProvider(
		'CODE',
		credentials,
	);
	const token = await provider.getBearerToken();
	expect(token.access_token.length).toBeGreaterThan(0);
});

test('GetSubscription', async () => {
	const credentials = await getOAuthClientCredentials('CODE');
	const provider: BearerTokenProvider = new BearerTokenProvider(
		'CODE',
		credentials,
	);
	const getSubscription = new GetSubscription('CODE', provider);
	const response = await getSubscription.getSubscription('A-S00663703');
	expect(response.id.length).toBeGreaterThan(0);
	const expectedDate = new Date('2023-09-08');
	expect(response.contractEffectiveDate).toEqual(expectedDate);
});
