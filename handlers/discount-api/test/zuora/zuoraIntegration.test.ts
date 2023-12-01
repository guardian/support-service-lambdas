/**
 * Tests zuora-secrets integration
 *
 * @group integration
 */

import { BearerTokenProvider } from '../../src/zuora/bearerTokenProvider';
import { getSubscription } from '../../src/zuora/getSubscription';
import { getOAuthClientCredentials } from '../../src/zuora/oAuthCredentials';
import { ZuoraClient } from '../../src/zuora/zuoraClient';

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
	const stage = 'CODE';
	const credentials = await getOAuthClientCredentials(stage);
	const provider: BearerTokenProvider = new BearerTokenProvider(
		stage,
		credentials,
	);
	const zuoraClient = new ZuoraClient(stage, provider);
	const response = await getSubscription(stage, zuoraClient, 'A-S00663703');
	expect(response.id.length).toBeGreaterThan(0);
	const expectedDate = new Date('2023-09-08');
	expect(response.contractEffectiveDate).toEqual(expectedDate);
});
