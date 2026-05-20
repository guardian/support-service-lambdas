import { describePayments as describeSchedule } from '@modules/email/emailDataFields/dayZero/paymentDescription';
import type { EmailPaymentSchedule } from '@modules/email/emailDataFields/dayZero/types';

type Payment = { date: Date; amount: number };
type PaymentSchedule = EmailPaymentSchedule;

function addMonths(date: Date, months: number): Date {
	const d = new Date(date.getTime());
	d.setUTCMonth(d.getUTCMonth() + months);
	return d;
}

function payments(original: Payment, subsequentMonths: number[]): Payment[] {
	const subsequentPayments = subsequentMonths.map((m) => ({
		date: addMonths(original.date, m),
		amount: original.amount,
	}));
	return [original, ...subsequentPayments];
}

describe('paymentDescription.describe', () => {
	const referenceDate = new Date(Date.UTC(2019, 0, 14)); // Jan 14 2019 UTC

	test('explains a simple annual payment schedule correctly', () => {
		const standardDigitalPackPayment: Payment = {
			date: referenceDate,
			amount: 119.9,
		};
		const scheduleList = payments(standardDigitalPackPayment, [12]);
		const schedule: PaymentSchedule = { payments: scheduleList };
		const expected = '£119.90 every year';
		expect(describeSchedule(schedule, 'Annual', 'GBP', false)).toBe(expected);
	});

	test('explains a simple quarterly payment schedule correctly', () => {
		const standardDigitalPackPayment: Payment = {
			date: referenceDate,
			amount: 57.5,
		};
		const scheduleList = payments(standardDigitalPackPayment, [3, 6, 9]);
		const schedule: PaymentSchedule = { payments: scheduleList };
		const expected = '$57.50 every quarter';
		expect(describeSchedule(schedule, 'Quarterly', 'USD', false)).toBe(
			expected,
		);
	});

	test('explains a simple monthly payment schedule correctly', () => {
		const standardDigitalPackPayment: Payment = {
			date: referenceDate,
			amount: 11.99,
		};
		const scheduleList = payments(
			standardDigitalPackPayment,
			[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		);
		const schedule: PaymentSchedule = { payments: scheduleList };
		const expected = '€11.99 every month';
		expect(describeSchedule(schedule, 'Monthly', 'EUR', false)).toBe(expected);
	});

	test('explains a payment schedule truthfully if we only get information about the first payment', () => {
		const discountedDigitalPackPayment: Payment = {
			date: referenceDate,
			amount: 100.9,
		};
		const schedule: PaymentSchedule = {
			payments: [discountedDigitalPackPayment],
		};
		const expected = '£100.90 for the first year';
		expect(describeSchedule(schedule, 'Annual', 'GBP', false)).toBe(expected);
	});

	test('explains a payment schedule correctly if the first 3 months are discounted', () => {
		const firstDiscountedPayment: Payment = {
			date: referenceDate,
			amount: 5.99,
		};
		const firstFullPricePayment: Payment = {
			date: addMonths(referenceDate, 3),
			amount: 11.99,
		};
		const scheduleList: Payment[] = [
			...payments(firstDiscountedPayment, [1, 2]),
			...payments(firstFullPricePayment, [1, 2, 3, 4, 5, 6, 7, 8, 9]),
		];
		const schedule: PaymentSchedule = { payments: scheduleList };
		const expected = '£5.99 every month for 3 months, then £11.99 every month';
		expect(describeSchedule(schedule, 'Monthly', 'GBP', false)).toBe(expected);
	});

	test('explains a payment schedule correctly for an annual subscription', () => {
		const firstDiscountedPayment: Payment = {
			date: referenceDate,
			amount: 59.76,
		};
		const firstFullPricePayment: Payment = {
			date: addMonths(referenceDate, 12),
			amount: 95.0,
		};
		const schedule: PaymentSchedule = {
			payments: [firstDiscountedPayment, firstFullPricePayment],
		};
		const expected = '£59.76 for the first year, then £95.00 every year';
		expect(describeSchedule(schedule, 'Annual', 'GBP', false)).toBe(expected);
	});

	test('explains a payment schedule correctly if the first 2 quarters are discounted', () => {
		const firstDiscountedPayment: Payment = {
			date: referenceDate,
			amount: 30.0,
		};
		const firstFullPricePayment: Payment = {
			date: addMonths(referenceDate, 6),
			amount: 37.5,
		};
		const scheduleList: Payment[] = [
			...payments(firstDiscountedPayment, [3]),
			...payments(firstFullPricePayment, [3, 6]),
		];
		const schedule: PaymentSchedule = { payments: scheduleList };
		const expected =
			'£30.00 every quarter for 2 quarters, then £37.50 every quarter';
		expect(describeSchedule(schedule, 'Quarterly', 'GBP', false)).toBe(
			expected,
		);
	});

	test('correctly formats zero amounts with multiple zero amounts in the payment schedule', () => {
		const zeroPayment: Payment = { date: referenceDate, amount: 0.0 };
		const scheduleList: Payment[] = payments(zeroPayment, [10]);
		const schedule: PaymentSchedule = { payments: scheduleList };
		const got = describeSchedule(schedule, 'Monthly', 'AUD', false);
		expect(got).toBe('$0.00 every month');
	});

	test('correctly formats zero amounts with a single zero amount in the payment schedule', () => {
		const zeroPayment: Payment = { date: referenceDate, amount: 0.0 };
		const schedule: PaymentSchedule = { payments: [zeroPayment] };
		const got = describeSchedule(schedule, 'Monthly', 'AUD', false);
		expect(got).toBe('$0.00 for the first month');
	});
});
