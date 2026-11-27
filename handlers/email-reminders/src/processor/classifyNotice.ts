import dayjs from 'dayjs';
import utcPlugin from 'dayjs/plugin/utc';

dayjs.extend(utcPlugin);

export type ClassifiableCharge = {
	type: string;
	model: string;
	billingPeriod: string | null;
	effectiveStartDate: Date;
	upToPeriods: number | null;
	upToPeriodsType: string | null;
	triggerEvent?: string;
	triggerDate?: Date | null;
};

export type ClassifiableSubscription = {
	contractEffectiveDate: Date;
	serviceActivationDate: Date;
	customerAcceptanceDate: Date;
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
			billingStartDate: string;
			monthsSinceStart: number;
			discountEndDates: string[];
			// Reminders could instead be anchored to the end of the last offer; logged for comparison
			renewalReminderAnchoredToOfferEnd: boolean;
	  };

const isDiscountCharge = (charge: ClassifiableCharge) =>
	charge.model.startsWith('Discount');

// The Discounts product also holds credits such as holiday stops, and legacy discounts sit under a Promotions product
const isProductRatePlan = (ratePlan: {
	productName: string;
	ratePlanCharges: ClassifiableCharge[];
}) =>
	ratePlan.productName !== 'Discounts' &&
	!ratePlan.ratePlanCharges.every(isDiscountCharge);

const billingPeriodMonths: Record<string, number> = {
	Month: 1,
	Quarter: 3,
	Annual: 12,
};

const reminderIntervalMonths = (periodMonths: number) =>
	periodMonths === 12 ? 12 : 6;

const utc = (date: Date) => dayjs.utc(date);

// Rounded to absorb bill cycle day alignment
const monthsBetween = (from: Date, to: Date) =>
	Math.round(utc(to).diff(utc(from), 'month', true));

// Zuora caps a discount's effectiveEndDate at the term end, so work out the real end from its periods.
// A discount's billing periods are its own, which can differ from the product's (e.g. 12 months off an annual plan).
export function discountEndDate(
	charge: ClassifiableCharge,
	productPeriodMonths: number,
): Date | undefined {
	const { upToPeriods, upToPeriodsType, effectiveStartDate } = charge;
	const periodMonths =
		(charge.billingPeriod === null
			? undefined
			: billingPeriodMonths[charge.billingPeriod]) ?? productPeriodMonths;
	if (upToPeriods === null) {
		return undefined;
	}
	switch (upToPeriodsType) {
		case 'Days':
			return utc(effectiveStartDate).add(upToPeriods, 'day').toDate();
		case 'Weeks':
			return utc(effectiveStartDate).add(upToPeriods, 'week').toDate();
		case 'Months':
			return utc(effectiveStartDate).add(upToPeriods, 'month').toDate();
		case 'Years':
			return utc(effectiveStartDate).add(upToPeriods, 'year').toDate();
		case 'Billing_Periods':
		case 'Billing Periods':
			return utc(effectiveStartDate)
				.add(upToPeriods * periodMonths, 'month')
				.toDate();
		case null:
		default:
			return undefined;
	}
}

// Billing starts on the date matching the charge's trigger, which can be weeks after the contract date,
// e.g. after a trial or when delivery starts. These dates are fixed, so amendments don't move the anchor.
function billingStartDate(
	subscription: ClassifiableSubscription,
	charge: ClassifiableCharge | undefined,
): Date {
	switch (charge?.triggerEvent) {
		case 'ServiceActivation':
			return subscription.serviceActivationDate;
		case 'CustomerAcceptance':
			return subscription.customerAcceptanceDate;
		case 'SpecificDate':
			return charge.triggerDate ?? subscription.contractEffectiveDate;
		case undefined:
		default:
			return subscription.contractEffectiveDate;
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
	const productRatePlans = currentRatePlans.filter(isProductRatePlan);
	const [productRatePlan, ...otherRatePlans] = productRatePlans;
	if (productRatePlan === undefined || otherRatePlans.length > 0) {
		return {
			status: 'unsupported',
			reason: `expected one product rate plan, found ${productRatePlans.length}`,
		};
	}
	const productCharge = productRatePlan.ratePlanCharges.find(
		(charge) => charge.type === 'Recurring',
	);
	const billingPeriod = productCharge?.billingPeriod;
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

	const billing = dayjs.utc(billingDate).toDate();
	const intervalMonths = reminderIntervalMonths(periodMonths);

	const discountEnds = currentRatePlans
		.flatMap((ratePlan) => ratePlan.ratePlanCharges)
		.filter(isDiscountCharge)
		.map((charge) => discountEndDate(charge, periodMonths))
		.filter((date): date is Date => date !== undefined)
		.sort((a, b) => a.getTime() - b.getTime());
	const discountEndDates = discountEnds.map((date) =>
		utc(date).format('YYYY-MM-DD'),
	);

	const isEndOfOffer = discountEndDates.includes(billingDate);

	const billingStart = billingStartDate(subscription, productCharge);
	const monthsSinceStart = monthsBetween(billingStart, billing);
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
		billingStartDate: utc(billingStart).format('YYYY-MM-DD'),
		monthsSinceStart,
		discountEndDates,
		renewalReminderAnchoredToOfferEnd,
	};
}
