// This file defines a one time contribution product. This file is combined
// with the Zuora & Stripe products to create a full product catalog.
import type { Product } from '@modules/product-catalog/productCatalog';

export const oneTimeContribution: {
	OneTimeContribution: Product<'OneTimeContribution'>;
} = {
	OneTimeContribution: {
		billingSystem: 'stripe',
		active: true,
		ratePlans: {
			OneTime: {
				id: 'single_contribution',
				// Contribution amounts are variable and not tied to the product catalog
				// so leave this as 0 for now
				pricing: {
					GBP: 0,
					USD: 0,
					NZD: 0,
					EUR: 0,
					AUD: 0,
					CAD: 0,
				},
				// One time contributions don't have charges in the same way as Zuora
				charges: {
					Contribution: { id: 'single_contribution' },
				},
				billingPeriod: 'OneTime',
			},
		},
	},
};

export const oneTimeContributionTypeObject = {
	OneTimeContribution: {
		billingPeriods: ['OneTime'],
		productRatePlans: {
			OneTime: {
				Contribution: {},
			},
		},
	},
};
