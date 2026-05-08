// this is the billing period of a subscription charge
// https://developer.zuora.com/v1-api-reference/api/subscriptions/put_subscription#subscriptions/put_subscription/t=request&path=add/chargeoverrides/billingperiod
export const BillingPeriodValues = [
	'Month',
	'Quarter',
	'Semi_Annual',
	'Annual',
	'Eighteen_Months',
	'Two_Years',
	'Three_Years',
	'Five_Years',
	'Specific_Months',
	'Subscription_Term',
	'Week',
	'Specific_Weeks',
	'OneTime',
] as const;
export type BillingPeriod = (typeof BillingPeriodValues)[number];
export const isBillingPeriod = (
	billingPeriod: unknown,
): billingPeriod is BillingPeriod => {
	return (BillingPeriodValues as readonly unknown[]).includes(billingPeriod);
};
