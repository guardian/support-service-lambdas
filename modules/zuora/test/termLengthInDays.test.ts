import dayjs from 'dayjs';
import { initialTermInDays } from '@modules/zuora/orders/orderActions';

test('InitialTermLength', () => {
	const termStart = dayjs('2019-2-3');
	const firstPaperDate = termStart.add(3, 'day');
	const termLength = initialTermInDays(termStart, firstPaperDate, 3);
	expect(termLength).toBe(92);
});
