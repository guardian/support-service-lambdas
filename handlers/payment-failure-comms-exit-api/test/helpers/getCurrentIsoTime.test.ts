import { getCurrentIsoTime } from '../../src/helpers/getCurrentIsoTime';

describe('getCurrentIsoTime', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('returns the current time in ISO-8601 format', () => {
		jest.useFakeTimers().setSystemTime(new Date('2026-09-08T12:00:00.000Z'));

		expect(getCurrentIsoTime()).toBe('2026-09-08T12:00:00.000Z');
	});
});
