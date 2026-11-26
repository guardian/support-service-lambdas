import { logger } from '@modules/logger/logger';
import { createSrApi } from '@modules/routing/apiGatewayHandler';
import { api } from '../src';

jest.mock('@hono/aws-lambda', () => ({ handle: jest.fn() }));

const sendToProcessor = jest.fn(() => Promise.resolve());
const app = createSrApi(api, { sendToProcessor }, 'CODE');

const validCallout = {
	subscriptionNumber: 'A-S00123456',
	accountNumber: 'A00123456',
	chargeNumber: 'C-01954845',
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
	beforeEach(() => {
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
		jest.spyOn(logger, 'error').mockImplementation(() => undefined);
		sendToProcessor.mockClear();
	});

	afterEach(() => {
		logger.resetContext();
		jest.restoreAllMocks();
	});

	it('accepts a valid callout and passes it to the processor', async () => {
		const response = await postCallout(validCallout);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'accepted' });
		expect(sendToProcessor).toHaveBeenCalledWith(
			JSON.stringify({
				notificationId: 'notification-1',
				subscriptionNumber: 'A-S00123456',
				accountNumber: 'A00123456',
				chargeNumber: 'C-01954845',
				billingDate: '2026-12-09',
			}),
		);
	});

	it('rejects a callout without a subscription number', async () => {
		const { subscriptionNumber: _, ...withoutSubscription } = validCallout;

		const response = await postCallout(withoutSubscription);

		expect(response.status).toBe(400);
		expect(sendToProcessor).not.toHaveBeenCalled();
	});

	it('rejects a callout with a non-ISO date', async () => {
		const response = await postCallout({
			...validCallout,
			chargedThroughDate: '09/12/2026',
		});

		expect(response.status).toBe(400);
	});
});
