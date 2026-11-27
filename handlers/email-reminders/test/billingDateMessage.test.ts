import { parseBillingDateMessage } from '../src/billingDateMessage';

const validCallout = {
	subscriptionNumber: 'A-S00123456',
	accountNumber: 'A00123456',
	chargeNumber: 'C-01954845',
	chargedThroughDate: '2026-12-09',
};

// shape written to SQS by cdk/lib/cdk/ApiGatewayToSqs.ts
const queued = (body: unknown, headers: Record<string, string> = {}) =>
	JSON.stringify({
		pathParameters: {},
		headers: { 'Content-Type': 'application/json', ...headers },
		queryStringParameters: {},
		body: JSON.stringify(body),
		httpMethod: 'POST',
		path: '/',
		mappingSource: 'SrCDK',
	});

describe('parseBillingDateMessage', () => {
	it('maps a queued callout to a billing date message', () => {
		expect(
			parseBillingDateMessage(
				queued(validCallout, { 'Zuora-Notification-Id': 'notification-1' }),
			),
		).toEqual({
			notificationId: 'notification-1',
			subscriptionNumber: 'A-S00123456',
			accountNumber: 'A00123456',
			chargeNumber: 'C-01954845',
			billingDate: '2026-12-09',
		});
	});

	it('rejects a callout without a subscription number', () => {
		const { subscriptionNumber: _, ...withoutSubscription } = validCallout;
		expect(() =>
			parseBillingDateMessage(queued(withoutSubscription)),
		).toThrow();
	});

	it('rejects a callout with a non-ISO date', () => {
		expect(() =>
			parseBillingDateMessage(
				queued({ ...validCallout, chargedThroughDate: '09/12/2026' }),
			),
		).toThrow();
	});
});
