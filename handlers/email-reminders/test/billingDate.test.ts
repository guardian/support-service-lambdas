import { logger } from '@modules/logger/logger';
import { createSrApi } from '@modules/routing/apiGatewayHandler';
import { api } from '../src';

jest.mock('@hono/aws-lambda', () => ({ handle: jest.fn() }));

const app = createSrApi(api, {}, 'CODE');

const validCallout = {
	subscriptionNumber: 'A-S00123456',
	accountNumber: 'A00123456',
	ratePlanChargeId: '8a12345678901234567890123456789a',
	chargedThroughDate: '2026-12-09',
};

function postCallout(body: unknown) {
	return app.request('/zuora-callouts/billing-date', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Zuora-Notification-Id': 'notification-1',
		},
		body: JSON.stringify(body),
	});
}

describe('billing date callout', () => {
	let logSpy: jest.SpyInstance;

	beforeEach(() => {
		logSpy = jest.spyOn(logger, 'log').mockImplementation(() => undefined);
		jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		logger.resetContext();
		jest.restoreAllMocks();
	});

	it('accepts a valid callout and logs it with the notification id', async () => {
		const response = await postCallout(validCallout);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'accepted' });
		expect(logSpy).toHaveBeenCalledWith(
			'received billing date callout',
			expect.objectContaining({
				notificationId: 'notification-1',
				subscriptionNumber: 'A-S00123456',
			}),
		);
	});

	it('rejects a callout without a subscription number', async () => {
		const { subscriptionNumber: _, ...withoutSubscription } = validCallout;

		const response = await postCallout(withoutSubscription);

		expect(response.status).toBe(400);
	});
});
