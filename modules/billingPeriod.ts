export const BillingPeriodValues = ['Month', 'Quarter', 'Annual'] as const;
export type BillingPeriod = (typeof BillingPeriodValues)[number];
export const isBillingPeriod = (billingPeriod: unknown): billingPeriod is BillingPeriod => {
    return (BillingPeriodValues as readonly unknown[]).includes(billingPeriod);
}
