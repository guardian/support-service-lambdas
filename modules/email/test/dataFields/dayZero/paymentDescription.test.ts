import { describePayments as describeSchedule } from '@modules/email/dataFields/dayZero/paymentDescription';
import type {
	EmailPaymentSchedule,
	Payment,
} from '@modules/email/dataFields/dayZero/types';

function addMonths(date: Date, months: number): Date {
	const d = new Date(date.getTime());
	d.setUTCMonth(d.getUTCMonth() + months);
	return d;
}

function payments(original: Payment, subsequentMonths: number[]): Payment[] {
	const subsequentPayments = subsequentMonths.map((m) => ({
		date: addMonths(original.date, m),
		amount: original.amount,
		amountWithoutTax: original.amountWithoutTax,
		taxAmount: original.taxAmount,
	}));
	return [original, ...subsequentPayments];
}

describe('paymentDescription.describe', () => {
	const referenceDate = new Date(Date.UTC(2019, 0, 14)); // Jan 14 2019 UTC

	test('explains a simple annual payment schedule correctly', () => {
		const standardDigitalPackPayment: Payment = {
			date: referenceDate,
			amount: 119.9,
			taxAmount: 19.9,
			amountWithoutTax: 100,
		};
		const scheduleList = payments(standardDigitalPackPayment, [12]);
		const schedule: EmailPaymentSchedule = { payments: scheduleList };
		const expected = '£119.90 every year';
		expect(
			describeSchedule(schedule, 'Annual', 'GBP', false, 'TaxInclusive'),
		).toBe(expected);
	});

	test('explains a simple annual tax exclusive payment schedule correctly', () => {
		const standardDigitalPackPayment: Payment = {
			date: referenceDate,
			amount: 119.9,
			taxAmount: 19.9,
			amountWithoutTax: 100,
		};
		const scheduleList = payments(standardDigitalPackPayment, [12]);
		const schedule: EmailPaymentSchedule = { payments: scheduleList };
		const expected = '£100.00 every year';
		expect(
			describeSchedule(schedule, 'Annual', 'GBP', false, 'TaxExclusive'),
		).toBe(expected);
	});

	test('explains a simple quarterly payment schedule correctly', () => {
		const standardDigitalPackPayment: Payment = {
			date: referenceDate,
			amount: 57.5,
			taxAmount: 7.5,
			amountWithoutTax: 50,
		};
		const scheduleList = payments(standardDigitalPackPayment, [3, 6, 9]);
		const schedule: EmailPaymentSchedule = { payments: scheduleList };
		const expected = '$57.50 every quarter';
		expect(
			describeSchedule(schedule, 'Quarterly', 'USD', false, 'TaxInclusive'),
		).toBe(expected);
	});

	test('explains a simple monthly payment schedule correctly', () => {
		const standardDigitalPackPayment: Payment = {
			date: referenceDate,
			amount: 11.99,
			taxAmount: 2.99,
			amountWithoutTax: 9.0,
		};
		const scheduleList = payments(
			standardDigitalPackPayment,
			[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
		);
		const schedule: EmailPaymentSchedule = { payments: scheduleList };
		const expected = '€11.99 every month';
		expect(
			describeSchedule(schedule, 'Monthly', 'EUR', false, 'TaxInclusive'),
		).toBe(expected);
	});

	test('explains a payment schedule truthfully if we only get information about the first payment', () => {
		const discountedDigitalPackPayment: Payment = {
			date: referenceDate,
			amount: 100.9,
			taxAmount: 5.9,
			amountWithoutTax: 95.0,
		};
		const schedule: EmailPaymentSchedule = {
			payments: [discountedDigitalPackPayment],
		};
		const expected = '£100.90 for the first year';
		expect(
			describeSchedule(schedule, 'Annual', 'GBP', false, 'TaxInclusive'),
		).toBe(expected);
	});

	test('explains a payment schedule correctly if the first 3 months are discounted', () => {
		const firstDiscountedPayment: Payment = {
			date: referenceDate,
			amount: 5.99,
			taxAmount: 0.99,
			amountWithoutTax: 5.0,
		};
		const firstFullPricePayment: Payment = {
			date: addMonths(referenceDate, 3),
			amount: 11.99,
			taxAmount: 1.99,
			amountWithoutTax: 10.0,
		};
		const scheduleList: Payment[] = [
			...payments(firstDiscountedPayment, [1, 2]),
			...payments(firstFullPricePayment, [1, 2, 3, 4, 5, 6, 7, 8, 9]),
		];
		const schedule: EmailPaymentSchedule = { payments: scheduleList };
		const expected = '£5.99 every month for 3 months, then £11.99 every month';
		expect(
			describeSchedule(schedule, 'Monthly', 'GBP', false, 'TaxInclusive'),
		).toBe(expected);
	});

	test('explains a payment schedule correctly for an annual subscription', () => {
		const firstDiscountedPayment: Payment = {
			date: referenceDate,
			amount: 59.76,
			taxAmount: 9.76,
			amountWithoutTax: 50.0,
		};
		const firstFullPricePayment: Payment = {
			date: addMonths(referenceDate, 12),
			amount: 95.0,
			taxAmount: 5.0,
			amountWithoutTax: 90.0,
		};
		const schedule: EmailPaymentSchedule = {
			payments: [firstDiscountedPayment, firstFullPricePayment],
		};
		const expected = '£59.76 for the first year, then £95.00 every year';
		expect(
			describeSchedule(schedule, 'Annual', 'GBP', false, 'TaxInclusive'),
		).toBe(expected);
	});

	test('explains a payment schedule correctly if the first 2 quarters are discounted', () => {
		const firstDiscountedPayment: Payment = {
			date: referenceDate,
			amount: 30.0,
			taxAmount: 2.0,
			amountWithoutTax: 28.0,
		};
		const firstFullPricePayment: Payment = {
			date: addMonths(referenceDate, 6),
			amount: 37.5,
			taxAmount: 2.5,
			amountWithoutTax: 35.0,
		};
		const scheduleList: Payment[] = [
			...payments(firstDiscountedPayment, [3]),
			...payments(firstFullPricePayment, [3, 6]),
		];
		const schedule: EmailPaymentSchedule = { payments: scheduleList };
		const expected =
			'£30.00 every quarter for 2 quarters, then £37.50 every quarter';
		expect(
			describeSchedule(schedule, 'Quarterly', 'GBP', false, 'TaxInclusive'),
		).toBe(expected);
	});

	test('correctly formats zero amounts with multiple zero amounts in the payment schedule', () => {
		const zeroPayment: Payment = {
			date: referenceDate,
			amount: 0.0,
			taxAmount: 0.0,
			amountWithoutTax: 0.0,
		};
		const scheduleList: Payment[] = payments(zeroPayment, [10]);
		const schedule: EmailPaymentSchedule = { payments: scheduleList };
		const got = describeSchedule(
			schedule,
			'Monthly',
			'AUD',
			false,
			'TaxInclusive',
		);
		expect(got).toBe('$0.00 every month');
	});

	test('correctly formats zero amounts with a single zero amount in the payment schedule', () => {
		const zeroPayment: Payment = {
			date: referenceDate,
			amount: 0.0,
			taxAmount: 0.0,
			amountWithoutTax: 0.0,
		};
		const schedule: EmailPaymentSchedule = { payments: [zeroPayment] };
		const got = describeSchedule(
			schedule,
			'Monthly',
			'AUD',
			false,
			'TaxInclusive',
		);
		expect(got).toBe('$0.00 for the first month');
	});
});
