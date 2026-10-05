import dayjs from 'dayjs';
import {
	expiryTTLFromTermEndDate,
	type SecondaryUserRecord,
	SecondaryUserRepository,
} from '../src/secondaryUserRepository';

const repository = new SecondaryUserRepository({} as never, 'table');

const termEnd = dayjs('2026-06-15T00:00:00');
const endOfTermEndDay = termEnd.endOf('day');

function record(overrides: Partial<SecondaryUserRecord> = {}) {
	return {
		subscriptionName: 'A-S1',
		secondaryIdentityId: '2',
		primaryIdentityId: '1',
		acceptedDate: '2026-01-01T00:00:00.000Z',
		expiryDate: expiryTTLFromTermEndDate(termEnd),
		invitationCode: 'code',
		...overrides,
	} satisfies SecondaryUserRecord;
}

describe('SecondaryUserRepository.isActive', () => {
	it('is active well before the term end', () => {
		expect(repository.isActive(record(), termEnd.subtract(1, 'month'))).toBe(
			true,
		);
	});

	it('is active at the start of the term end day', () => {
		expect(repository.isActive(record(), termEnd)).toBe(true);
	});

	it('is active one millisecond before the end of the term end day', () => {
		expect(
			repository.isActive(record(), endOfTermEndDay.subtract(1, 'millisecond')),
		).toBe(true);
	});

	it('is not active the day after the term end', () => {
		expect(repository.isActive(record(), termEnd.add(1, 'day'))).toBe(false);
	});

	it('is not active when cancelled, even before the term end', () => {
		expect(
			repository.isActive(
				record({ cancelledBy: 'primary' }),
				termEnd.subtract(1, 'day'),
			),
		).toBe(false);
	});
});
