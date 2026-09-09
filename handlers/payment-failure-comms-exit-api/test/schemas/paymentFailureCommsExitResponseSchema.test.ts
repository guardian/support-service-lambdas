import { paymentFailureCommsExitResponseSchema } from '../../src/schemas/paymentFailureCommsExitResponseSchema';

describe('paymentFailureCommsExitResponseSchema', () => {
	it('accepts the only successful response shape', () => {
		expect(
			paymentFailureCommsExitResponseSchema.parse({ status: 'sent' }),
		).toEqual({ status: 'sent' });
	});

	it('rejects other response statuses', () => {
		expect(() =>
			paymentFailureCommsExitResponseSchema.parse({ status: 'queued' }),
		).toThrow();
	});
});
