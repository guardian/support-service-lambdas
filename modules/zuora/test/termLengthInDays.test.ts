import dayjs from 'dayjs';
import { initialTermInDays } from '@modules/zuora/orders/orderActions';

describe('initialTermInDays', () => {
	test(
		'returns the total number of days from the contract effective date ' +
			'to [termLength] days after the customer acceptance date',
		() => {
			const contractEffectiveDate = dayjs('2019-2-3');
			const firstPaperDate = contractEffectiveDate.add(3, 'day');
			const termLengthInDays = initialTermInDays(
				contractEffectiveDate,
				firstPaperDate,
				3,
			);
			expect(termLengthInDays).toBe(92);
		},
	);
});
