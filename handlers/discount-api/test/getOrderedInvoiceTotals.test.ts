import { getOrderedInvoiceTotals } from '@modules/zuora/billingPreview';

test('getOrderedInvoiceTotals doesnt affect if theyre already in order', () => {
	const items = [
		{ date: new Date('2020-01-01'), amount: 0 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-03-01'), amount: 10 },
	];

	const actual = getOrderedInvoiceTotals(items);

	expect(actual).toEqual([
		{ date: new Date('2020-01-01'), total: 0 },
		{ date: new Date('2020-02-01'), total: 10 },
		{ date: new Date('2020-03-01'), total: 10 },
	]);
});

test('getOrderedInvoiceTotals reorders them if theyre NOT in order', () => {
	const items = [
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-01-01'), amount: 0 },
		{ date: new Date('2020-03-01'), amount: 10 },
	];

	const actual = getOrderedInvoiceTotals(items);

	expect(actual).toEqual([
		{ date: new Date('2020-01-01'), total: 0 },
		{ date: new Date('2020-02-01'), total: 10 },
		{ date: new Date('2020-03-01'), total: 10 },
	]);
});

test('getOrderedInvoiceTotals adds them up and reorders them', () => {
	const items = [
		{ date: new Date('2020-01-01'), amount: 1 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-03-01'), amount: 100 },
		{ date: new Date('2020-02-01'), amount: 20 },
		{ date: new Date('2020-01-01'), amount: 2 },
	];

	const actual = getOrderedInvoiceTotals(items);

	expect(actual).toEqual([
		{ date: new Date('2020-01-01'), total: 3 },
		{ date: new Date('2020-02-01'), total: 30 },
		{ date: new Date('2020-03-01'), total: 100 },
	]);
});
