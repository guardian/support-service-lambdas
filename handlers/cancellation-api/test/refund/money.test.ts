import { toPence } from '../../src/refund/money';

describe('toPence', () => {
	it('converts pounds to whole pence', () => {
		expect(toPence(12.14)).toBe(1214);
		expect(toPence(-0.58)).toBe(-58);
	});

	it('throws on a fraction of a penny', () => {
		expect(() => toPence(454.5454545)).toThrow(
			'454.5454545 is not a whole number of pence',
		);
	});

	it('returns 0 rather than -0', () => {
		expect(Object.is(toPence(-0), 0)).toBe(true);
	});
});
