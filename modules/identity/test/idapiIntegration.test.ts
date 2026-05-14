/**
 * @group integration
 */

import { createGuestAccount, getUserByEmail } from '@modules/identity/idapi';
import { IdentityClient } from '@modules/identity/identityClient';

describe('idapi module', () => {
	test('getUserByEmail returns user for valid email', async () => {
		const email = 'integration-test@theguardian.com';
		const client = await IdentityClient.create(
			'CODE',
			'/CODE/support/press-reader-entitlements/identity-client-access-token',
		);
		const user = await getUserByEmail(client, email);
		expect(user?.primaryEmailAddress).toBe(email);
	});

	test('getUserByEmail returns undefined for emails with no account', async () => {
		const email = `nonexistent-${Date.now()}@theguardian.com`;
		const client = await IdentityClient.create(
			'CODE',
			'/CODE/support/press-reader-entitlements/identity-client-access-token',
		);
		const user = await getUserByEmail(client, email);
		expect(user).toBeUndefined();
	});

	// skipped because we don't want to create hundreds of guest accounts
	test.skip('createGuestAccount works correctly', async () => {
		const client = await IdentityClient.create(
			'CODE',
			'/CODE/support/press-reader-entitlements/identity-client-access-token',
		);
		const identityId = await createGuestAccount(
			client,
			`${Date.now()}@theguardian.com`,
		);
		expect(/^\d+$/.test(identityId)).toBe(true);
	});
});
