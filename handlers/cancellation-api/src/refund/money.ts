/**
 * Converts an amount to whole pence, rounding half up (away from zero) as Zuora does.
 * https://knowledgecenter.zuora.com/Billing/Billing_and_Payments/TB_Rounding_and_Precision
 */
export function toPence(amount: number): number {
	// toPrecision removes floating point noise, e.g. 1.005 * 100 = 100.49999999999999
	const absolutePence = Number((Math.abs(amount) * 100).toPrecision(12));
	return Math.sign(amount) * Math.round(absolutePence) || 0;
}

export const fromPence = (pence: number): number => pence / 100;
