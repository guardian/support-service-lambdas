import type { SQSRecord } from 'aws-lambda';
import { handleSubscriptionEventMessage } from '@modules/subscription-events/consumer/eventBridgeSqsHandler';

const validCancellationEvent = {
	version: '0',
	id: '9773f4b3-ff25-5ef2-b41b-791f868d424e',
	'detail-type': 'Cancellation',
	source: 'lambda:zuora-auto-cancel-PROD',
	account: '123456789',
	time: '2026-09-07T14:41:33Z',
	region: 'eu-west-1',
	resources: [],
	detail: {
		subscriptionNumber: 'A-S00001234',
		orderNumber: 'O-00005678',
		allowUserNotifications: true,
	},
};

const recordWith = (body: unknown): SQSRecord =>
	({
		messageId: 'msg-0',
		body: JSON.stringify(body),
	}) as SQSRecord;

describe('handleSubscriptionEventMessage', () => {
	it('parses the record and calls the handler with the validated event', async () => {
		const handler = jest.fn().mockResolvedValue(undefined);
		const services = { some: 'service' };

		await handleSubscriptionEventMessage(handler)(
			recordWith(validCancellationEvent),
			services,
		);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(
			expect.objectContaining({ 'detail-type': 'Cancellation' }),
			services,
		);
	});

	it('throws if the record body fails validation', async () => {
		const handler = jest.fn().mockResolvedValue(undefined);

		await expect(
			handleSubscriptionEventMessage(handler)(
				recordWith({ ...validCancellationEvent, detail: {} }),
				{},
			),
		).rejects.toThrow();

		expect(handler).not.toHaveBeenCalled();
	});

	it('propagates an error thrown by the handler', async () => {
		const handler = jest.fn().mockRejectedValue(new Error('handler failed'));

		await expect(
			handleSubscriptionEventMessage(handler)(
				recordWith(validCancellationEvent),
				{},
			),
		).rejects.toThrow('handler failed');
	});
});
