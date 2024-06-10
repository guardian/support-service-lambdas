import { getNextNonFreePaymentDate } from '../src/discountEndpoint';

test('getNextPaymentDate fails if there are no payments in the preview', () => {
	const items = [
		{ date: new Date('2020-02-01'), amount: 0 },
		{ date: new Date('2020-01-01'), amount: 0 },
		{ date: new Date('2020-01-01'), amount: 0 },
	];

	const actual = () => getNextNonFreePaymentDate(items);

	expect(actual).toThrow('could not find a non free payment in the preview');
});

test('getNextPaymentDate finds the relevant payment', () => {
	const items = [
		{ date: new Date('2020-01-01'), amount: 0 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-03-01'), amount: 10 },
	];

	const actual = getNextNonFreePaymentDate(items);

	expect(actual).toEqual('2020-02-01');
});

test('getNextPaymentDate finds the relevant payment in reverse order', () => {
	const items = [
		{ date: new Date('2020-03-01'), amount: 10 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-01-01'), amount: 0 },
	];

	const actual = getNextNonFreePaymentDate(items);

	expect(actual).toEqual('2020-02-01');
});

test('getNextPaymentDate finds the relevant payment even if theres duplicates', () => {
	const items = [
		{ date: new Date('2020-01-01'), amount: 0 },
		{ date: new Date('2020-02-01'), amount: 0 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-03-01'), amount: 10 },
	];

	const actual = getNextNonFreePaymentDate(items);

	expect(actual).toEqual('2020-02-01');
});

test('getNextPaymentDate finds the relevant payment in reverse order even if theres duplicates', () => {
	const items = [
		{ date: new Date('2020-03-01'), amount: 10 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-02-01'), amount: 0 },
		{ date: new Date('2020-01-01'), amount: 0 },
	];

	const actual = getNextNonFreePaymentDate(items);

	expect(actual).toEqual('2020-02-01');
});
