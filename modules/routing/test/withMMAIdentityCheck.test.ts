import { ValidationError } from '@modules/errors';
import type { ZuoraAccount } from '@modules/zuora/types';
import { zuoraAccountSchema } from '@modules/zuora/types';
import accountJson from '../../../handlers/product-switch-api/test/fixtures/account.json';
import { assertIdentityIdMatches } from '../src/withMMAIdentityCheck';

describe('mmaIdentityCheck', () => {
	let account: ZuoraAccount;

	beforeEach(() => {
		account = zuoraAccountSchema.parse(accountJson);
	});

	test('owner check passes when identity IDs match', () => {
		const headers = { 'x-identity-id': '999999999999' };

		expect(() => assertIdentityIdMatches(account, headers)).not.toThrow();
	});

	test('owner check is bypassed when x-identity-id header is not provided (for Salesforce)', () => {
		const headers = {};

		expect(() => assertIdentityIdMatches(account, headers)).not.toThrow();
	});

	test("owner check throws ValidationError when identity IDs don't match", () => {
		const headers = { 'x-identity-id': '12345' };

		expect(() => assertIdentityIdMatches(account, headers)).toThrow(
			ValidationError,
		);
		expect(() => assertIdentityIdMatches(account, headers)).toThrow(
			'Subscription does not belong to identity ID 12345',
		);
	});
});
