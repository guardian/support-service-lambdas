import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
import { ZuoraError } from '@modules/zuora/errors/zuoraError';
import type { ZuoraAccount } from '@modules/zuora/types';
import {
	zuoraAccountSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import accountJson from '../../../handlers/product-switch-api/test/fixtures/account.json';
import subscriptionJson from '../../../handlers/product-switch-api/test/fixtures/subscription.json';
import { buildErrorResponse } from '../src/apiGatewayResponses';
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

	it('passes the loaded Zuora subscription and account to the business handler', async () => {
		const get = mockLookup();
		const request = {
			headers: { 'x-identity-id': account.basicInfo.identityId },
			params: { subscriptionNumber: subscription.subscriptionNumber },
		};
		const handler = jest.fn(() => Promise.resolve('business result'));
		const wrapped = withSubscription(handler);

		await expect(wrapped({ zuoraClient }, request)).resolves.toBe(
			'business result',
		);
		expect(handler).toHaveBeenCalledWith({ zuoraClient }, request, {
			subscription,
			account,
		});
		expect(get).toHaveBeenNthCalledWith(
			1,
			`v1/subscriptions/${subscription.subscriptionNumber}`,
			zuoraSubscriptionSchema,
		);
	});

	// keep the same message to avoid letting people enumerate subscription numbers
	const genericSubRejection =
		'Subscription does not belong to identity ID 12345';

	it.each(['missing', 'unowned'])(
		'returns the original identity error for a %s subscription through the legacy wrapper',
		async (scenario) => {
			const get = jest.spyOn(zuoraClient, 'get');
			if (scenario === 'missing') {
				get.mockRejectedValueOnce(
					new ZuoraError(
						'Subscription missing',
						{ status: 200, responseBody: {}, responseHeaders: {} },
						[{ code: '50000040', message: 'Subscription missing' }],
					),
				);
			} else {
				get.mockResolvedValueOnce(subscription).mockResolvedValueOnce(account);
			}
			jest.spyOn(ZuoraClient, 'create').mockResolvedValue(zuoraClient);
			const handler = jest.fn(() =>
				Promise.resolve({ statusCode: 200, body: '' }),
			);
			const wrapped = withMMAIdentityCheck(
				'CODE',
				handler,
				() => subscription.subscriptionNumber,
			);

			const response = await wrapped(
				{ headers: { 'x-identity-id': '12345' } },
				{},
				{},
			).catch(buildErrorResponse);
			expect(response.statusCode).toBe(400);
			expect(response.body).toBe(
				JSON.stringify({
					message: genericSubRejection,
				}),
			);
			expect(handler).not.toHaveBeenCalled();
		},
	);

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
			genericSubRejection,
		);
	});
});
