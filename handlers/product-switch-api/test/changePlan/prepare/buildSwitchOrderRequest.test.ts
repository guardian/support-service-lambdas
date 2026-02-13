import dayjs from 'dayjs';
import { shouldStartNewTerm } from '../../../src/changePlan/prepare/buildSwitchOrderRequest';

describe('shouldStartNewTerm', () => {
	test('returns true when the term start date is before today', () => {
		expect(
			shouldStartNewTerm(new Date('2024-01-01'), dayjs('2024-05-01')),
		).toBe(true);
	});

	test('returns false when the term start date is the same as today', () => {
		const today = dayjs('2024-05-01T11:30:00Z');
		expect(shouldStartNewTerm(today.toDate(), today)).toBe(false);
	});
});
