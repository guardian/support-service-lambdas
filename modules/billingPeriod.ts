// this is the billing period of a subscription charge
// https://developer.zuora.com/v1-api-reference/api/operation/POST_Subscription/
export const BillingPeriodValues = ['Month', 'Quarter', 'Annual'] as const;
export type BillingPeriod = (typeof BillingPeriodValues)[number];
export const isBillingPeriod = (
	billingPeriod: unknown,
): billingPeriod is BillingPeriod => {
	return (BillingPeriodValues as readonly unknown[]).includes(billingPeriod);
};
