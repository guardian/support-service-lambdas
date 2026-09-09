import { paymentFailureCommsExitRequestSchema } from '../../src/schemas/paymentFailureCommsExitRequestSchema';

describe('paymentFailureCommsExitRequestSchema', () => {
	it('trims a valid Identity ID', () => {
		expect(
			paymentFailureCommsExitRequestSchema.parse({
				identityId: ' 200000001 ',
			}),
		).toEqual({ identityId: '200000001' });
	});

	it.each([
		{},
		{ identityId: '' },
		{ identityId: 200000001 },
		{ identityId: '1', extra: true },
	])('rejects invalid request bodies: %p', (body) => {
		expect(() => paymentFailureCommsExitRequestSchema.parse(body)).toThrow();
	});
});
