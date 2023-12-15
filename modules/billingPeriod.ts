export const BillingPeriodValues = ['Month', 'Annual'] as const;
export type BillingPeriod = (typeof BillingPeriodValues)[number];
