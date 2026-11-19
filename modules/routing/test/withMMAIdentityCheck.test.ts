import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
import type { ZuoraAccount } from '@modules/zuora/types';
import {
	zuoraAccountSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import accountJson from '../../../handlers/product-switch-api/test/fixtures/account.json';
import subscriptionJson from '../../../handlers/product-switch-api/test/fixtures/subscription.json';
import {
	assertIdentityIdMatches,
	withMMAIdentityCheck,
	withSubscription,
} from '../src/withMMAIdentityCheck';

describe('mmaIdentityCheck', () => {
	let account: ZuoraAccount;
	const subscription = zuoraSubscriptionSchema.parse(subscriptionJson);
	const zuoraClient = new ZuoraClient({
		getAuthorisation: () =>
			Promise.resolve({ baseUrl: 'https://example.invalid', authHeaders: {} }),
	});

	beforeEach(() => {
		account = zuoraAccountSchema.parse(accountJson);
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
	});

	afterEach(() => {
		logger.resetContext();
		jest.restoreAllMocks();
	});

	function mockLookup() {
		return jest
			.spyOn(zuoraClient, 'get')
			.mockResolvedValueOnce(subscription)
			.mockResolvedValueOnce(account);
	}

	it('preserves the legacy handler arguments, default lookup, CSR access and result', async () => {
		const get = mockLookup();
		jest.spyOn(ZuoraClient, 'create').mockResolvedValue(zuoraClient);
		const result = { statusCode: 200, body: 'legacy result' };
		const handler = jest.fn(() => Promise.resolve(result));
		const wrapped = withMMAIdentityCheck(
			'CODE',
			handler,
			({ path }: { path: { subscriptionNumber: string }; body: object }) =>
				path.subscriptionNumber,
		);
		const path = { subscriptionNumber: subscription.subscriptionNumber };
		const body = {};
		const context = { getRemainingTimeInMillis: () => 1000 };

		await expect(wrapped({ headers: {} }, path, body, context)).resolves.toBe(
			result,
		);
		expect(handler).toHaveBeenCalledWith(
			body,
			zuoraClient,
			subscription,
			account,
			path,
			context,
		);
		expect(get).toHaveBeenNthCalledWith(
			1,
			`v1/subscriptions/${subscription.subscriptionNumber}`,
			zuoraSubscriptionSchema,
		);
	});

	it('passes raw Zuora data to the business handler using the requested charge detail', async () => {
		const get = mockLookup();
		const request = {
			headers: { 'x-identity-id': account.basicInfo.identityId },
			params: { subscriptionNumber: subscription.subscriptionNumber },
		};
		const handler = jest.fn(() => Promise.resolve('business result'));
		const wrapped = withSubscription(
			zuoraClient,
			handler,
			(parsed: typeof request) => parsed.params.subscriptionNumber,
			'last-segment',
		);

		await expect(wrapped(request)).resolves.toBe('business result');
		expect(handler).toHaveBeenCalledWith(request, { subscription, account });
		expect(get).toHaveBeenNthCalledWith(
			1,
			`v1/subscriptions/${subscription.subscriptionNumber}`,
			zuoraSubscriptionSchema,
			new URLSearchParams({ 'charge-detail': 'last-segment' }),
		);
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
