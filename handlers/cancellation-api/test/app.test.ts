import { logger } from '@modules/logger/logger';
import { app } from '../src/cancel';

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
			type: 'immediate',
			willRefund: false,
		});
	});
});
