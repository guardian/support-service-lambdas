import { brazeTrackResponseSchema } from '../../src/schemas/brazeTrackResponseSchema';

describe('brazeTrackResponseSchema', () => {
	it('retains documented fields and unknown fields from Braze', () => {
		expect(
			brazeTrackResponseSchema.parse({
				message: 'accepted',
				errors: [],
				responseId: 'request-id',
			}),
		).toEqual({
			message: 'accepted',
			errors: [],
			responseId: 'request-id',
		});
	});

	it('rejects non-string Braze errors', () => {
		expect(() => brazeTrackResponseSchema.parse({ errors: [1] })).toThrow();
	});
});
