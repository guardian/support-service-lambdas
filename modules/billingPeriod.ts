export const BillingPeriodValues = ['Month', 'Quarter', 'Annual'] as const;
export type BillingPeriod = (typeof BillingPeriodValues)[number];
