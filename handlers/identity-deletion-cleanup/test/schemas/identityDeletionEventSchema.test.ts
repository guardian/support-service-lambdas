import {
	identityDeletionEventSchema,
	identityDeletionSnsEnvelopeSchema,
} from '../../src/schemas/identityDeletionEventSchema';

describe('Identity deletion event schemas', () => {
	it('accepts an Identity deletion event from the account-deletion topic', () => {
		expect(
			identityDeletionEventSchema.parse({
				userId: '1234567',
				brazeId: null,
				eventType: 'DELETE',
			}),
		).toEqual({
			userId: '1234567',
			eventType: 'DELETE',
		});
	});

	it('rejects an empty or non-numeric user ID', () => {
		expect(
			identityDeletionEventSchema.safeParse({ eventType: 'DELETE' }).success,
		).toBe(false);
		expect(
			identityDeletionEventSchema.safeParse({
				userId: ' 1234567 ',
				eventType: 'DELETE',
			}).success,
		).toBe(false);
	});

	it('rejects an event which is not an account deletion', () => {
		expect(
			identityDeletionEventSchema.safeParse({
				userId: '1234567',
				eventType: 'CREATE',
			}).success,
		).toBe(false);
	});

	it('accepts an SNS notification envelope', () => {
		expect(
			identityDeletionSnsEnvelopeSchema.safeParse({
				Type: 'Notification',
				Message: '{"userId":"1234567"}',
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
