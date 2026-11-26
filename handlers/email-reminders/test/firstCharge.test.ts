import { checkFirstCharge } from '../src/processor/firstCharge';

const charge = (number: string, chargedThroughDate: string | null) => ({
	number,
	chargedThroughDate:
		chargedThroughDate === null ? null : new Date(chargedThroughDate),
});

const charges = [
	charge('C-01954845', '2026-12-09'),
	charge('C-01954844', '2026-12-09'),
	charge('C-01954846', '2026-12-09'),
	charge('C-00000001', '2026-11-09'), // ended discount, lower number but different date
	charge('C-00000002', null),
];

describe('checkFirstCharge', () => {
	it('chooses the lowest numbered charge billing on the date, compared numerically', () => {
		expect(checkFirstCharge(charges, 'C-01954844', '2026-12-09')).toBe(
			'firstCharge',
		);
		expect(checkFirstCharge(charges, 'C-01954845', '2026-12-09')).toBe(
			'notFirstCharge',
		);
		expect(checkFirstCharge(charges, 'C-01954846', '2026-12-09')).toBe(
			'notFirstCharge',
		);
	});

	it('compares numbers numerically rather than as strings', () => {
		expect(
			checkFirstCharge(
				[charge('C-9', '2026-12-09'), charge('C-10', '2026-12-09')],
				'C-9',
				'2026-12-09',
			),
		).toBe('firstCharge');
	});

	it('reports when the callout charge no longer bills on the date', () => {
		expect(checkFirstCharge(charges, 'C-00000001', '2026-12-09')).toBe(
			'chargeNotBilling',
		);
		expect(checkFirstCharge(charges, 'C-99999999', '2026-12-09')).toBe(
			'chargeNotBilling',
		);
	});
});
