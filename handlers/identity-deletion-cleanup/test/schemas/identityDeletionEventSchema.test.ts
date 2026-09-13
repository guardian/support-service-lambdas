import {
	identityDeletionEventSchema,
	identityDeletionSnsEnvelopeSchema,
} from '../../src/schemas';

describe('Identity deletion event schemas', () => {
	it('accepts an Identity deletion event from the account-deletion topic', () => {
		expect(
			identityDeletionEventSchema.parse({
				userId: 'deleted-identity-id',
				brazeId: null,
				eventType: 'DELETE',
			}),
		).toEqual({
			userId: 'deleted-identity-id',
			brazeId: null,
			eventType: 'DELETE',
		});
	});

	it('rejects an event without a user ID', () => {
		expect(
			identityDeletionEventSchema.safeParse({ eventType: 'DELETE' }).success,
		).toBe(false);
	});

	it('rejects an event which is not an account deletion', () => {
		expect(
			identityDeletionEventSchema.safeParse({
				userId: 'identity-id',
				eventType: 'UPDATE',
			}).success,
		).toBe(false);
	});

	it('accepts notification and subscription confirmation SNS envelopes', () => {
		expect(
			identityDeletionSnsEnvelopeSchema.safeParse({
				Type: 'Notification',
				Message: '{"userId":"deleted-identity-id"}',
			}).success,
		).toBe(true);
		expect(
			identityDeletionSnsEnvelopeSchema.safeParse({
				Type: 'SubscriptionConfirmation',
			}).success,
		).toBe(true);
	});

	it('rejects unsupported SNS envelope types', () => {
		expect(
			identityDeletionSnsEnvelopeSchema.safeParse({
				Type: 'UnsubscribeConfirmation',
			}).success,
		).toBe(false);
	});
});
