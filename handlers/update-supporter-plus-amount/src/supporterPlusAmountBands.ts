import type { Currency } from '@modules/internationalisation/currency';
import type { ProductBillingPeriod } from '@modules/product-catalog/productBillingPeriods';

export const supporterPlusAmountBands: {
	[C in Currency]: {
		[K in ProductBillingPeriod<'SupporterPlus'>]: { min: number; max: number };
	};
} = {
	GBP: {
		Month: { min: 10, max: 166 },
		Annual: { min: 95, max: 2000 },
	},

	AUD: {
		Month: { min: 17, max: 200 },
		Annual: { min: 160, max: 2400 },
	},

	USD: {
		Month: { min: 13, max: 800 },
		Annual: { min: 120, max: 10000 },
	},
	NZD: {
		Month: { min: 17, max: 200 },
		Annual: { min: 160, max: 2400 },
	},
	CAD: {
		Month: { min: 13, max: 166 },
		Annual: { min: 120, max: 2000 },
	},
	EUR: {
		Month: { min: 10, max: 166 },
		Annual: { min: 95, max: 2000 },
	},
} as const;
