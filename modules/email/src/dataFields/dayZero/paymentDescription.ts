import dayjs from 'dayjs';
import { partition } from '@modules/arrayFunctions';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getCurrencyInfo } from '@modules/internationalisation/currency';
import { getNonEmptyOrThrow, isNonEmpty } from '@modules/nullAndUndefined';
import type { EmailBillingPeriod, EmailPaymentSchedule } from './types';

type Payment = EmailPaymentSchedule['payments'][number];

function billingPeriodNoun(period: EmailBillingPeriod): string {
	switch (period) {
		case 'Monthly':
			return 'month';
		case 'Quarterly':
			return 'quarter';
		case 'Annual':
			return 'year';
	}
}

export function formatPrice(amount: number): string {
	return amount.toFixed(2);
}

export function priceWithCurrency(
	currency: IsoCurrency,
	amount: number,
): string {
	return `${getCurrencyInfo(currency).glyph}${formatPrice(amount)}`;
}

export function firstPayment(paymentSchedule: EmailPaymentSchedule): Payment {
	if (isNonEmpty(paymentSchedule.payments)) {
		return earliestPayment(paymentSchedule.payments);
	}
	throw new Error('Payment schedule has no payments');
}

// Helper that asserts a non-empty array of payments and returns the earliest one
function earliestPayment(payments: [Payment, ...Payment[]]): Payment {
	return payments.reduce<Payment>(
		(min, payment) => (payment.date < min.date ? payment : min),
		payments[0],
	);
}

export function pluralise(num: number, thing: string): string {
	return num > 1 ? `${num} ${thing}s` : `${num} ${thing}`;
}

export function introductoryPeriod(
	introductoryBillingPeriods: number,
	billingPeriod: EmailBillingPeriod,
): string {
	return pluralise(
		introductoryBillingPeriods,
		billingPeriodNoun(billingPeriod),
	);
}

export function fixedTermNoun(billingPeriod: EmailBillingPeriod): string {
	switch (billingPeriod) {
		case 'Quarterly':
			return '3 months';
		case 'Annual':
			return '12 months';
		case 'Monthly':
			return 'month';
	}
}

function monthsBetween(start: Date, end: Date): number {
	const startD = dayjs(start);
	const endD = dayjs(end);
	return endD.diff(startD, 'month');
}

function getRelevantAmountFromPayment(
	taxMode: string | undefined | null,
	payment: Payment,
) {
	return taxMode === 'TaxExclusive'
		? payment.amountWithoutTax
		: payment.amountWithoutTax + payment.taxAmount;
}

export function describePayments(
	paymentSchedule: EmailPaymentSchedule,
	billingPeriod: EmailBillingPeriod,
	currency: IsoCurrency,
	isFixedTerm: boolean,
	taxMode: string | undefined | null,
): string {
	const initialPrice = getRelevantAmountFromPayment(
		taxMode,
		firstPayment(paymentSchedule),
	);

	const [paymentsWithInitialPrice, paymentsWithDifferentPrice] = partition(
		paymentSchedule.payments,
		(payment) =>
			getRelevantAmountFromPayment(taxMode, payment) === initialPrice,
	);

	const noun = billingPeriodNoun(billingPeriod);

	if (isFixedTerm) {
		return `${priceWithCurrency(currency, initialPrice)} for ${fixedTermNoun(
			billingPeriod,
		)}`;
	}
	if (paymentSchedule.payments.length === 1) {
		return `${priceWithCurrency(currency, initialPrice)} for the first ${noun}`;
	}
	if (paymentsWithDifferentPrice.length === 0) {
		return `${priceWithCurrency(currency, initialPrice)} every ${noun}`;
	}
	if (
		paymentsWithInitialPrice.length === 1 &&
		isNonEmpty(paymentsWithDifferentPrice)
	) {
		return descriptionWithSingleIntroductoryPeriod(
			paymentsWithDifferentPrice,
			currency,
			initialPrice,
			billingPeriod,
			taxMode,
		);
	}
	return descriptionWithMultipleIntroductoryPeriods(
		getNonEmptyOrThrow(
			paymentsWithInitialPrice,
			"There are no payments at the initial price, this shouldn't be possible as we have checked above",
		),
		getNonEmptyOrThrow(
			paymentsWithDifferentPrice,
			"There are no payments at a different price, this shouldn't be possible as we have checked above",
		),
		currency,
		initialPrice,
		billingPeriod,
		taxMode,
	);
}

function descriptionWithSingleIntroductoryPeriod(
	paymentsWithDifferentPrice: [Payment, ...Payment[]],
	currency: IsoCurrency,
	initialPrice: number,
	billingPeriod: EmailBillingPeriod,
	taxMode: string | undefined | null,
) {
	const firstDifferent = paymentsWithDifferentPrice[0];
	return `${priceWithCurrency(
		currency,
		initialPrice,
	)} for the first ${billingPeriodNoun(
		billingPeriod,
	)}, then ${priceWithCurrency(
		currency,
		getRelevantAmountFromPayment(taxMode, firstDifferent),
	)} every ${billingPeriodNoun(billingPeriod)}`;
}

function descriptionWithMultipleIntroductoryPeriods(
	paymentsWithInitialPrice: [Payment, ...Payment[]],
	paymentsWithDifferentPrice: [Payment, ...Payment[]],
	currency: IsoCurrency,
	initialPrice: number,
	billingPeriod: EmailBillingPeriod,
	taxMode: string | undefined | null,
) {
	const firstIntroductoryPayment = earliestPayment(paymentsWithInitialPrice);
	const firstDifferentPayment = earliestPayment(paymentsWithDifferentPrice);
	const monthsAtIntroductoryPrice = monthsBetween(
		firstIntroductoryPayment.date,
		firstDifferentPayment.date,
	);
	let timespan: string;
	switch (billingPeriod) {
		case 'Annual':
			timespan = introductoryPeriod(
				monthsAtIntroductoryPrice / 12,
				billingPeriod,
			);
			break;
		case 'Quarterly':
			timespan = introductoryPeriod(
				monthsAtIntroductoryPrice / 3,
				billingPeriod,
			);
			break;
		case 'Monthly':
			timespan = introductoryPeriod(monthsAtIntroductoryPrice, billingPeriod);
			break;
		default:
			timespan = introductoryPeriod(monthsAtIntroductoryPrice, billingPeriod);
	}
	return `${priceWithCurrency(
		currency,
		initialPrice,
	)} every ${billingPeriodNoun(
		billingPeriod,
	)} for ${timespan}, then ${priceWithCurrency(
		currency,
		getRelevantAmountFromPayment(
			taxMode,
			earliestPayment(paymentsWithDifferentPrice),
		),
	)} every ${billingPeriodNoun(billingPeriod)}`;
}
