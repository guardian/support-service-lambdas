import { getNewTermLength } from '@modules/zuora/addDiscount';
import dayjs from 'dayjs';

test('newTermLength', () => {
	const termStartDate = dayjs('2023-12-22');
	const nextBillingDate = dayjs('2025-01-07');
	expect(getNewTermLength(termStartDate, nextBillingDate)).toEqual(382);
});
