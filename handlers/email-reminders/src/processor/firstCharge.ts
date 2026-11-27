export type ChargeBillingDate = {
	number: string;
	chargedThroughDate: Date | null;
};

export type FirstChargeResult =
	| 'firstCharge'
	| 'notFirstCharge'
	| 'chargeNotBilling';

const chargeNumberValue = (chargeNumber: string): number =>
	Number(chargeNumber.replace(/\D/g, ''));

const isSameDate = (a: Date | null, isoDate: string) =>
	a !== null && a.toISOString().slice(0, 10) === isoDate;

/**
 * Zuora sends one callout per charge, so a subscription with several charges billing on the same
 * date gets several callouts. Exactly one of them, the one for the lowest numbered charge billing
 * on that date (the first charge), is processed; the rest are dropped.
 *
 * If the callout's charge no longer bills on that date, the subscription has been amended since
 * the callout was sent and we can't tell whether another callout will be for the first charge, so it
 * is reported.
 */
export function checkFirstCharge(
	charges: ChargeBillingDate[],
	calloutChargeNumber: string,
	billingDate: string,
): FirstChargeResult {
	const candidates = charges.filter((charge) =>
		isSameDate(charge.chargedThroughDate, billingDate),
	);
	if (!candidates.some((charge) => charge.number === calloutChargeNumber)) {
		return 'chargeNotBilling';
	}
	const lowest = Math.min(
		...candidates.map((charge) => chargeNumberValue(charge.number)),
	);
	return chargeNumberValue(calloutChargeNumber) === lowest
		? 'firstCharge'
		: 'notFirstCharge';
}
