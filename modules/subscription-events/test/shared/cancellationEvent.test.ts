import { cancellationEventSchema } from '@modules/subscription-events/shared/cancellationEvent';

describe('cancellationEventSchema', () => {
	const validEvent = {
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

	it('parses a valid Cancellation event', () => {
		const result = cancellationEventSchema.parse(validEvent);
		expect(result.detail).toEqual({
			subscriptionNumber: 'A-S00001234',
			orderNumber: 'O-00005678',
			allowUserNotifications: true,
		});
	});

	it('rejects a non-Cancellation detail-type', () => {
		expect(() =>
			cancellationEventSchema.parse({
				...validEvent,
				'detail-type': 'SomethingElse',
			}),
		).toThrow();
	});

	it('rejects a detail missing allowUserNotifications', () => {
		const { allowUserNotifications: _allowUserNotifications, ...rest } =
			validEvent.detail;
		expect(() =>
			cancellationEventSchema.parse({ ...validEvent, detail: rest }),
		).toThrow();
	});

	it('rejects an invalid subscriptionNumber', () => {
		expect(() =>
			cancellationEventSchema.parse({
				...validEvent,
				detail: { ...validEvent.detail, subscriptionNumber: 'has whitespace' },
			}),
		).toThrow();
	});
});
