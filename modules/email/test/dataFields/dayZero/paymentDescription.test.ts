import type { SimplifiedPaymentScheduleItem } from '@modules/email/dataFields/dayZero/paymentDescription';
import { describePayments as describeSchedule } from '@modules/email/dataFields/dayZero/paymentDescription';

function addMonths(date: Date, months: number): Date {
	const d = new Date(date.getTime());
	d.setUTCMonth(d.getUTCMonth() + months);
	return d;
}

function payments(
	original: SimplifiedPaymentScheduleItem,
	subsequentMonths: number[],
): SimplifiedPaymentScheduleItem[] {
	const subsequentPayments = subsequentMonths.map((m) => ({
		date: addMonths(original.date, m),
		amountWithTaxResolved: original.amountWithTaxResolved,
	}));
	return [original, ...subsequentPayments];
}

describe('paymentDescription.describe', () => {
	const referenceDate = new Date(Date.UTC(2019, 0, 14)); // Jan 14 2019 UTC

	test('explains a simple annual payment schedule correctly', () => {
		const standardDigitalPackPayment: SimplifiedPaymentScheduleItem = {
			date: referenceDate,
			amountWithTaxResolved: 119.9,
		};
		const scheduleList = payments(standardDigitalPackPayment, [12]);
		const expected = '£119.90 every year';
		expect(describeSchedule(scheduleList, 'Annual', 'GBP', false)).toBe(
			expected,
		);
	});

	test('explains a simple quarterly payment schedule correctly', () => {
		const standardDigitalPackPayment: SimplifiedPaymentScheduleItem = {
			date: referenceDate,
			amountWithTaxResolved: 57.5,
		};
		const scheduleList = payments(standardDigitalPackPayment, [3, 6, 9]);
		const expected = '$57.50 every quarter';
		expect(describeSchedule(scheduleList, 'Quarterly', 'USD', false)).toBe(
			expected,
		);
	});

	test('explains a simple monthly payment schedule correctly', () => {
		const standardDigitalPackPayment: SimplifiedPaymentScheduleItem = {
			date: referenceDate,
			amountWithTaxResolved: 11.99,
		};
		const scheduleList = payments(
			standardDigitalPackPayment,
			[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		);
		const expected = '€11.99 every month';
		expect(describeSchedule(scheduleList, 'Monthly', 'EUR', false)).toBe(
			expected,
		);
	});

	test('explains a payment schedule truthfully if we only get information about the first payment', () => {
		const discountedDigitalPackPayment: SimplifiedPaymentScheduleItem = {
			date: referenceDate,
			amountWithTaxResolved: 100.9,
		};
		const expected = '£100.90 for the first year';
		expect(
			describeSchedule([discountedDigitalPackPayment], 'Annual', 'GBP', false),
		).toBe(expected);
	});

	test('explains a payment schedule correctly if the first 3 months are discounted', () => {
		const firstDiscountedPayment: SimplifiedPaymentScheduleItem = {
			date: referenceDate,
			amountWithTaxResolved: 5.99,
		};
		const firstFullPricePayment: SimplifiedPaymentScheduleItem = {
			date: addMonths(referenceDate, 3),
			amountWithTaxResolved: 11.99,
		};
		const scheduleList = [
			...payments(firstDiscountedPayment, [1, 2]),
			...payments(firstFullPricePayment, [1, 2, 3, 4, 5, 6, 7, 8, 9]),
		];
		const expected = '£5.99 every month for 3 months, then £11.99 every month';
		expect(describeSchedule(scheduleList, 'Monthly', 'GBP', false)).toBe(
			expected,
		);
	});

	test('explains a payment schedule correctly for an annual subscription', () => {
		const firstDiscountedPayment: SimplifiedPaymentScheduleItem = {
			date: referenceDate,
			amountWithTaxResolved: 59.76,
		};
		const firstFullPricePayment: SimplifiedPaymentScheduleItem = {
			date: addMonths(referenceDate, 12),
			amountWithTaxResolved: 95.0,
		};
		const expected = '£59.76 for the first year, then £95.00 every year';
		expect(
			describeSchedule(
				[firstDiscountedPayment, firstFullPricePayment],
				'Annual',
				'GBP',
				false,
			),
		).toBe(expected);
	});

	test('explains a payment schedule correctly if the first 2 quarters are discounted', () => {
		const firstDiscountedPayment: SimplifiedPaymentScheduleItem = {
			date: referenceDate,
			amountWithTaxResolved: 30.0,
		};
		const firstFullPricePayment: SimplifiedPaymentScheduleItem = {
			date: addMonths(referenceDate, 6),
			amountWithTaxResolved: 37.5,
		};
		const scheduleList = [
			...payments(firstDiscountedPayment, [3]),
			...payments(firstFullPricePayment, [3, 6]),
		];
		const expected =
			'£30.00 every quarter for 2 quarters, then £37.50 every quarter';
		expect(describeSchedule(scheduleList, 'Quarterly', 'GBP', false)).toBe(
			expected,
		);
	});

	test('correctly formats zero amounts with multiple zero amounts in the payment schedule', () => {
		const zeroPayment: SimplifiedPaymentScheduleItem = {
			date: referenceDate,
			amountWithTaxResolved: 0.0,
		};
		const scheduleList = payments(zeroPayment, [10]);
		const got = describeSchedule(scheduleList, 'Monthly', 'AUD', false);
		expect(got).toBe('$0.00 every month');
	});

	test('correctly formats zero amounts with a single zero amount in the payment schedule', () => {
		const zeroPayment: SimplifiedPaymentScheduleItem = {
			date: referenceDate,
			amountWithTaxResolved: 0.0,
		};
		const got = describeSchedule([zeroPayment], 'Monthly', 'AUD', false);
		expect(got).toBe('$0.00 for the first month');
	});
});
