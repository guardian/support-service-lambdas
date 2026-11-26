export type ChargeBillingDate = {
	number: string;
	chargedThroughDate: Date | null;
};

export type LeaderResult = 'leader' | 'notLeader' | 'leaderNotFound';

const chargeNumberValue = (chargeNumber: string): number =>
	Number(chargeNumber.replace(/\D/g, ''));

const isSameDate = (a: Date | null, isoDate: string) =>
	a !== null && a.toISOString().slice(0, 10) === isoDate;

/**
 * Zuora sends one callout per charge, so a subscription with several charges billing on the same
 * date gets several callouts. Exactly one of them, the one for the lowest numbered charge billing
 * on that date, is treated as the leader and processed; the rest are dropped.
 *
 * If the callout's charge no longer bills on that date, the subscription has been amended since
 * the callout was sent and we can't tell whether another callout will lead, so it is reported.
 */
export function selectLeader(
	charges: ChargeBillingDate[],
	calloutChargeNumber: string,
	billingDate: string,
): LeaderResult {
	const candidates = charges.filter((charge) =>
		isSameDate(charge.chargedThroughDate, billingDate),
	);
	if (!candidates.some((charge) => charge.number === calloutChargeNumber)) {
		return 'leaderNotFound';
	}
	const lowest = Math.min(
		...candidates.map((charge) => chargeNumberValue(charge.number)),
	);
	return chargeNumberValue(calloutChargeNumber) === lowest
		? 'leader'
		: 'notLeader';
}
