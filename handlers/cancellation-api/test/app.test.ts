import { logger } from '@modules/logger/logger';
import { cancellationResponseSchema } from '../src/endpoints/cancellationContract';
import { app } from '../src/index';

jest.mock('@hono/aws-lambda', () => ({ handle: jest.fn() }));

const subscriptionPath = '/subscriptions/A-S12345678';
const headers = {
	'Content-Type': 'application/json',
	'x-identity-id': '123456789',
};

describe('Cancellation API', () => {
	beforeEach(() => {
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it.each([
		['preview-cancellation', {}],
		['cancel', {}],
		['cancel', { reason: 'mma_other' }],
	])('returns the RC example for %s', async (action, body) => {
		const response = await app.request(`${subscriptionPath}/${action}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			type: 'hard',
			willRefund: false,
		});
	});

	it.each([
		['/subscriptions/invalid%20subscription/cancel', headers, '{}'],
		[
			`${subscriptionPath}/cancel`,
			{ 'Content-Type': 'application/json' },
			'{}',
		],
		[
			`${subscriptionPath}/cancel`,
			{ ...headers, 'x-identity-id': 'abc123' },
			'{}',
		],
		[`${subscriptionPath}/cancel`, headers, '{"reason":""}'],
		[`${subscriptionPath}/cancel`, headers, '{"reason":123}'],
		[
			`${subscriptionPath}/preview-cancellation`,
			headers,
			'{"date":"2026-11-12"}',
		],
		[`${subscriptionPath}/cancel`, headers, '{"date":"2026-11-12"}'],
	])('rejects invalid input at %s', async (path, requestHeaders, body) => {
		const response = await app.request(path, {
			method: 'POST',
			headers: requestHeaders,
			body,
		});
		expect(response.status).toBe(400);
	});

	it.each(['12345678', 'GA1234', 'A-S12345678'])(
		'accepts subscription number %s on both endpoints',
		async (subscriptionNumber) => {
			for (const action of ['preview-cancellation', 'cancel']) {
				const response = await app.request(
					`/subscriptions/${subscriptionNumber}/${action}`,
					{ method: 'POST', headers, body: '{}' },
				);
				expect(response.status).toBe(200);
				expect(await response.json()).toEqual({
					type: 'hard',
					willRefund: false,
				});
			}
		},
	);

	it('includes both cancellation operations in generated OpenAPI', async () => {
		const response = await app.request('/openapi.json');
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			paths: {
				'/subscriptions/{subscriptionNumber}/preview-cancellation': {
					post: {
						operationId: 'previewCancellation',
						security: [{ apiKey: [] }],
					},
				},
				'/subscriptions/{subscriptionNumber}/cancel': {
					post: {
						operationId: 'cancelSubscription',
						security: [{ apiKey: [] }],
					},
				},
			},
		});
	});
});

describe('Cancellation response union', () => {
	it.each([
		{ type: 'hard', willRefund: false },
		{ type: 'soft', accessEndDate: '2026-12-12' },
	])('accepts the $type result', (body) => {
		expect(cancellationResponseSchema.safeParse(body).success).toBe(true);
	});

	it.each([
		{ type: 'hard' },
		{ type: 'hard', willRefund: false, accessEndDate: '2026-12-12' },
		{ type: 'soft', accessEndDate: '2026-12-12', willRefund: false },
		{ type: 'soft', accessEndDate: 'now' },
	])('rejects invalid or mixed variants', (body) => {
		expect(cancellationResponseSchema.safeParse(body).success).toBe(false);
	});
});
