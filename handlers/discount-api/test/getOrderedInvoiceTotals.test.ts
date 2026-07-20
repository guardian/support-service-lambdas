import { getOrderedInvoiceTotals } from '@modules/zuora/billingPreview';

test('getOrderedInvoiceTotals doesnt affect if theyre already in order', () => {
	const items = [
		{
			date: new Date('2020-01-01'),
			amount: 0,
			amountWithoutTax: 0,
			taxAmount: 0,
		},
		{
			date: new Date('2020-02-01'),
			amount: 10,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
		{
			date: new Date('2020-03-01'),
			amount: 10,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
	];

	const actual = getOrderedInvoiceTotals(items);

	expect(actual).toEqual([
		{
			date: new Date('2020-01-01'),
			total: 0,
			amountWithoutTax: 0,
			taxAmount: 0,
		},
		{
			date: new Date('2020-02-01'),
			total: 10,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
		{
			date: new Date('2020-03-01'),
			total: 10,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
	]);
});

test('getOrderedInvoiceTotals reorders them if theyre NOT in order', () => {
	const items = [
		{
			date: new Date('2020-02-01'),
			amount: 10,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
		{
			date: new Date('2020-01-01'),
			amount: 0,
			amountWithoutTax: 0,
			taxAmount: 0,
		},
		{
			date: new Date('2020-03-01'),
			amount: 10,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
	];

	const actual = getOrderedInvoiceTotals(items);

	expect(actual).toEqual([
		{
			date: new Date('2020-01-01'),
			total: 0,
			amountWithoutTax: 0,
			taxAmount: 0,
		},
		{
			date: new Date('2020-02-01'),
			total: 10,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
		{
			date: new Date('2020-03-01'),
			total: 10,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
	]);
});

test('getOrderedInvoiceTotals adds them up and reorders them', () => {
	const items = [
		{
			date: new Date('2020-01-01'),
			amount: 1,
			amountWithoutTax: 1,
			taxAmount: 0,
		},
		{
			date: new Date('2020-02-01'),
			amount: 10,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
		{
			date: new Date('2020-03-01'),
			amount: 100,
			amountWithoutTax: 80,
			taxAmount: 20,
		},
		{
			date: new Date('2020-02-01'),
			amount: 20,
			amountWithoutTax: 16,
			taxAmount: 4,
		},
		{
			date: new Date('2020-01-01'),
			amount: 2,
			amountWithoutTax: 2,
			taxAmount: 0,
		},
	];

	const actual = getOrderedInvoiceTotals(items);

	expect(actual).toEqual([
		{
			date: new Date('2020-01-01'),
			total: 3,
			amountWithoutTax: 3,
			taxAmount: 0,
		},
		{
			date: new Date('2020-02-01'),
			total: 30,
			amountWithoutTax: 24,
			taxAmount: 6,
		},
		{
			date: new Date('2020-03-01'),
			total: 100,
			amountWithoutTax: 80,
			taxAmount: 20,
		},
	]);
});
