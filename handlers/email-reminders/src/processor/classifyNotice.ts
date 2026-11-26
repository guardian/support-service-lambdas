export type ClassifiableCharge = {
	type: string;
	billingPeriod: string | null;
	effectiveStartDate: Date;
	upToPeriods: number | null;
	upToPeriodsType: string | null;
};

export type ClassifiableSubscription = {
	contractEffectiveDate: Date;
	ratePlans: Array<{
		productName: string;
		lastChangeType?: string;
		ratePlanCharges: ClassifiableCharge[];
	}>;
};

export type Notice = 'endOfOffer' | 'renewalReminder' | 'none';

export type Classification =
	| { status: 'unsupported'; reason: string }
	| {
			status: 'classified';
			notice: Notice;
			productName: string;
			billingPeriod: string;
			monthsSinceStart: number;
			discountEndDates: string[];
			// Reminders could instead be anchored to the end of the last offer; logged for comparison
			renewalReminderAnchoredToOfferEnd: boolean;
	  };

const discountProductName = 'Discounts';

const billingPeriodMonths: Record<string, number> = {
	Month: 1,
	Quarter: 3,
	Annual: 12,
};

const reminderIntervalMonths = (periodMonths: number) =>
	periodMonths === 12 ? 12 : 6;

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

const daysInMonthUtc = (year: number, month: number) =>
	new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

// Adds months the same way Zuora does, keeping the day of month where possible
export function addMonthsUtc(date: Date, months: number): Date {
	const totalMonths = date.getUTCMonth() + months;
	const year = date.getUTCFullYear() + Math.floor(totalMonths / 12);
	const month = ((totalMonths % 12) + 12) % 12;
	const day = Math.min(date.getUTCDate(), daysInMonthUtc(year, month));
	return new Date(Date.UTC(year, month, day));
}

const addDaysUtc = (date: Date, days: number) =>
	new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

// Whole months between two dates, rounded to absorb bill cycle day alignment
export function monthsBetween(from: Date, to: Date): number {
	return Math.round(
		(to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
			(to.getUTCMonth() - from.getUTCMonth()) +
			(to.getUTCDate() - from.getUTCDate()) / 31,
	);
}

// Zuora caps a discount's effectiveEndDate at the term end, so work out the real end from its periods
export function discountEndDate(
	charge: ClassifiableCharge,
	periodMonths: number,
): Date | undefined {
	const { upToPeriods, upToPeriodsType, effectiveStartDate } = charge;
	if (upToPeriods === null) {
		return undefined;
	}
	switch (upToPeriodsType) {
		case 'Days':
			return addDaysUtc(effectiveStartDate, upToPeriods);
		case 'Weeks':
			return addDaysUtc(effectiveStartDate, upToPeriods * 7);
		case 'Months':
			return addMonthsUtc(effectiveStartDate, upToPeriods);
		case 'Years':
			return addMonthsUtc(effectiveStartDate, upToPeriods * 12);
		case 'Billing_Periods':
		case 'Billing Periods':
			return addMonthsUtc(effectiveStartDate, upToPeriods * periodMonths);
		case null:
		default:
			return undefined;
	}
}

const isReminderMonth = (months: number, intervalMonths: number) =>
	months > 0 && months % intervalMonths === 0;

export function classifyNotice(
	subscription: ClassifiableSubscription,
	billingDate: string,
): Classification {
	const currentRatePlans = subscription.ratePlans.filter(
		(ratePlan) => ratePlan.lastChangeType !== 'Remove',
	);
	const productRatePlans = currentRatePlans.filter(
		(ratePlan) => ratePlan.productName !== discountProductName,
	);
	const [productRatePlan, ...otherRatePlans] = productRatePlans;
	if (productRatePlan === undefined || otherRatePlans.length > 0) {
		return {
			status: 'unsupported',
			reason: `expected one product rate plan, found ${productRatePlans.length}`,
		};
	}
	const billingPeriod = productRatePlan.ratePlanCharges.find(
		(charge) => charge.type === 'Recurring',
	)?.billingPeriod;
	const periodMonths =
		billingPeriod === undefined || billingPeriod === null
			? undefined
			: billingPeriodMonths[billingPeriod];
	if (billingPeriod === undefined || billingPeriod === null || !periodMonths) {
		return {
			status: 'unsupported',
			reason: `unsupported billing period ${billingPeriod}`,
		};
	}

	const billing = new Date(`${billingDate}T00:00:00Z`);
	const intervalMonths = reminderIntervalMonths(periodMonths);

	const discountEnds = currentRatePlans
		.filter((ratePlan) => ratePlan.productName === discountProductName)
		.flatMap((ratePlan) => ratePlan.ratePlanCharges)
		.map((charge) => discountEndDate(charge, periodMonths))
		.filter((date): date is Date => date !== undefined)
		.sort((a, b) => a.getTime() - b.getTime());
	const discountEndDates = discountEnds.map(toIsoDate);

	const isEndOfOffer = discountEndDates.includes(billingDate);

	const monthsSinceStart = monthsBetween(
		subscription.contractEffectiveDate,
		billing,
	);
	const isRenewalReminder = isReminderMonth(monthsSinceStart, intervalMonths);

	const lastOfferEnd = discountEnds
		.filter((date) => date.getTime() < billing.getTime())
		.at(-1);
	const renewalReminderAnchoredToOfferEnd =
		!isEndOfOffer &&
		(lastOfferEnd === undefined
			? isRenewalReminder
			: isReminderMonth(monthsBetween(lastOfferEnd, billing), intervalMonths));

	return {
		status: 'classified',
		notice: isEndOfOffer
			? 'endOfOffer'
			: isRenewalReminder
				? 'renewalReminder'
				: 'none',
		productName: productRatePlan.productName,
		billingPeriod,
		monthsSinceStart,
		discountEndDates,
		renewalReminderAnchoredToOfferEnd,
	};
}
