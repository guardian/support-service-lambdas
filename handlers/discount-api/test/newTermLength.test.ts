import { getNewTermLengthIfRequired } from '@modules/zuora/addDiscount';
import dayjs from 'dayjs';

test('getNewTermLengthIfRequired works out the new term length if the next billing date is after the current end date', () => {
	const termStartDate = dayjs('2023-12-22');
	const termEndDate = dayjs('2023-12-22');
	const nextBillingDate = dayjs('2025-01-07');
	expect(
		getNewTermLengthIfRequired(termStartDate, termEndDate, nextBillingDate)
			.currentTerm,
	).toEqual(382);
});

test('getNewTermLengthIfRequired returns an empty object if the next billing date is in the current term', () => {
	const termStartDate = dayjs('2023-12-22');
	const termEndDate = dayjs('2024-12-22');
	const nextBillingDate = dayjs('2024-01-07');
	expect(
		getNewTermLengthIfRequired(termStartDate, termEndDate, nextBillingDate),
	).toEqual({});
});

test('getNewTermLengthIfRequired returns an empty object if the next billing date is on the last day of the current term', () => {
	const termStartDate = dayjs('2023-12-22');
	const termEndDate = dayjs('2024-12-22');
	const nextBillingDate = dayjs('2024-12-22');
	expect(
		getNewTermLengthIfRequired(termStartDate, termEndDate, nextBillingDate),
	).toEqual({});
});
