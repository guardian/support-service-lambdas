import { getNextNonFreePaymentDate } from '@modules/zuora/billingPreview';
import { zuoraDateFormat } from '../../../modules/zuora/src/utils/common';
import dayjs from 'dayjs';

test('getNextNonFreePaymentDate fails if all payments are free', () => {
	const items = [
		{ date: new Date('2020-02-01'), amount: 0 },
		{ date: new Date('2020-01-01'), amount: 0 },
		{ date: new Date('2020-01-01'), amount: 0 },
	];

	const actual = () => getNextNonFreePaymentDate(items);

	expect(actual).toThrow(
		'could not find a non free payment in the invoice preview',
	);
});

test('getNextNonFreePaymentDate finds the relevant payment', () => {
	const items = [
		{ date: new Date('2020-01-01'), amount: 0 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-03-01'), amount: 10 },
	];

	const actual = getNextNonFreePaymentDate(items);

	expect(zuoraDateFormat(dayjs(actual))).toEqual('2020-02-01');
});

test('getNextNonFreePaymentDate finds the relevant payment in reverse order', () => {
	const items = [
		{ date: new Date('2020-03-01'), amount: 10 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-01-01'), amount: 0 },
	];

	const actual = getNextNonFreePaymentDate(items);

	expect(zuoraDateFormat(dayjs(actual))).toEqual('2020-02-01');
});

test('getNextNonFreePaymentDate finds the relevant payment even if theres duplicates', () => {
	const items = [
		{ date: new Date('2020-01-01'), amount: 0 },
		{ date: new Date('2020-02-01'), amount: 0 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-03-01'), amount: 10 },
	];

	const actual = getNextNonFreePaymentDate(items);

	expect(zuoraDateFormat(dayjs(actual))).toEqual('2020-02-01');
});

test('getNextNonFreePaymentDate finds the relevant payment in reverse order even if theres duplicates', () => {
	const items = [
		{ date: new Date('2020-03-01'), amount: 10 },
		{ date: new Date('2020-02-01'), amount: 10 },
		{ date: new Date('2020-02-01'), amount: 0 },
		{ date: new Date('2020-01-01'), amount: 0 },
	];

	const actual = getNextNonFreePaymentDate(items);

	expect(zuoraDateFormat(dayjs(actual))).toEqual('2020-02-01');
});
