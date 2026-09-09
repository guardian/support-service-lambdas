import { parseBrazeTrackResponse } from '../../src/helpers/parseBrazeTrackResponse';
import { brazeTrackResponseSchema } from '../../src/schemas/brazeTrackResponseSchema';

describe('parseBrazeTrackResponse', () => {
	it('parses an empty successful Braze response', () => {
		expect(parseBrazeTrackResponse('')).toEqual({});
	});

	it('parses a structured Braze response', () => {
		expect(
			parseBrazeTrackResponse(
				JSON.stringify({ message: 'accepted', errors: [], extra: 'value' }),
			),
		).toEqual({ message: 'accepted', errors: [], extra: 'value' });
	});

	it('rejects malformed or unexpected Braze responses', () => {
		expect(() => parseBrazeTrackResponse('not json')).toThrow(
			'Invalid response from Braze /users/track',
		);
		expect(() =>
			parseBrazeTrackResponse(JSON.stringify({ errors: [1] })),
		).toThrow('Invalid response from Braze /users/track');
	});

	it('preserves non-Error failures while adding Braze context', () => {
		const parseSpy = jest
			.spyOn(brazeTrackResponseSchema, 'parse')
			.mockImplementation(() => {
				// eslint-disable-next-line @typescript-eslint/only-throw-error -- exercises the defensive unknown-error branch
				throw 'unexpected response';
			});

		expect(() => parseBrazeTrackResponse('{}')).toThrow(
			'Invalid response from Braze /users/track: unexpected response',
		);

		parseSpy.mockRestore();
	});
});
