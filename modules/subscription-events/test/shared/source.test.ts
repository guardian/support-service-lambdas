import { subscriptionEventSourceSchema } from '@modules/subscription-events/shared/source';

describe('subscriptionEventSourceSchema', () => {
	it('accepts a known source', () => {
		expect(
			subscriptionEventSourceSchema.parse('lambda:zuora-auto-cancel'),
		).toEqual('lambda:zuora-auto-cancel');
	});

	it('rejects an unknown source', () => {
		expect(() =>
			subscriptionEventSourceSchema.parse('lambda:not-a-real-source'),
		).toThrow();
	});
});
