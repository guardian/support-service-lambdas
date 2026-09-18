import type { CurrencyCode } from '@modules/internationalisation/currency';
import type { ProductBillingPeriod } from '@modules/product-catalog/productBillingPeriods';

export const supporterPlusAmountBands: Record<
	CurrencyCode,
	Record<ProductBillingPeriod<'SupporterPlus'>, { min: number; max: number }>
> = {
	GBP: {
		Month: { min: 14, max: 166 },
		Annual: { min: 140, max: 2000 },
	},

	AUD: {
		Month: { min: 25, max: 200 },
		Annual: { min: 250, max: 2000 },
	},

	USD: {
		Month: { min: 18, max: 800 },
		Annual: { min: 180, max: 10000 },
	},
	NZD: {
		Month: { min: 25, max: 200 },
		Annual: { min: 250, max: 2000 },
	},
	CAD: {
		Month: { min: 18, max: 166 },
		Annual: { min: 180, max: 2000 },
	},
	EUR: {
		Month: { min: 14, max: 166 },
		Annual: { min: 140, max: 2000 },
	},
} as const;
