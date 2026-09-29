import { subscriptionEventSchema } from '@modules/subscription-events/shared/subscriptionEventSchema';

describe('subscriptionEventSchema', () => {
	const cancellationEvent = {
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

	it('parses a Cancellation event via the discriminated union', () => {
		const result = subscriptionEventSchema.parse(cancellationEvent);
		expect(result['detail-type']).toEqual('Cancellation');
	});

	it('rejects an unknown detail-type', () => {
		expect(() =>
			subscriptionEventSchema.parse({
				...cancellationEvent,
				'detail-type': 'NotARealEvent',
			}),
		).toThrow();
	});
});
