/**
 * Tests zuora-secrets integration
 *
 * @group integration
 */

import { getActiveAccountNumbersForIdentityId } from '@modules/zuora/getAccountsForIdentityId';
import { BearerTokenProvider } from '../src/bearerTokenProvider';
import { getSubscription } from '../src/getSubscription';
import { getOAuthClientCredentials } from '../src/oAuthCredentials';
import { ZuoraClient } from '../src/zuoraClient';

test('getZuoraCredentials', async () => {
	const credentials = await getOAuthClientCredentials('CODE');
	expect(credentials.clientSecret.length).toBeGreaterThan(0);
});

test('BearerTokenProvider', async () => {
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
	const zuoraClient = await ZuoraClient.create(stage);
	const response = await getSubscription(zuoraClient, 'A-S00663703');
	expect(response.id.length).toBeGreaterThan(0);
	const expectedDate = new Date('2023-09-08');
	expect(response.contractEffectiveDate).toEqual(expectedDate);
});

test('getActiveAccountsForIdentityId', async () => {
	const stage = 'CODE';
	const client = await ZuoraClient.create(stage);
	const accountIds = await getActiveAccountNumbersForIdentityId(
		client,
		'200264404',
	);
	console.log(accountIds);
	expect(accountIds.length).toBeGreaterThan(0);
});
