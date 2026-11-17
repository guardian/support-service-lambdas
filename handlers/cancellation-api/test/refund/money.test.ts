import { toPence } from '../../src/refund/money';

describe('toPence', () => {
	it('rounds half up to whole pence', () => {
		expect(toPence(454.5454545)).toBe(45455);
		expect(toPence(454.5444545)).toBe(45454);
	});

	it('is not thrown off by floating point error', () => {
		expect(toPence(1.005)).toBe(101);
		expect(toPence(12.14)).toBe(1214);
	});

	it('rounds negative amounts away from zero', () => {
		expect(toPence(-0.025)).toBe(-3);
		expect(toPence(-0.58)).toBe(-58);
	});

	it('returns 0 rather than -0', () => {
		expect(Object.is(toPence(-0.001), 0)).toBe(true);
	});
});
