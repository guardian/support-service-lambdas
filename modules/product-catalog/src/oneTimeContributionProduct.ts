// This file defines a one time contribution product. This file is combined
// with the Zuora & Stripe products to create a full product catalog.
import type { Product } from '@modules/product-catalog/newProductCatalogTypes';

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
				pricing: {},
				// One time contributions don't have charges in the same way as Zuora
				charges: {
					Contribution: { id: 'single_contribution' },
				},
				billingPeriod: 'OneTime',
			},
		},
	},
};

export const oneTimeContributionSchema = `OneTimeContribution: z.object({
	billingSystem: z.literal('stripe'),
	active: z.boolean(),
	ratePlans: z.object({
		OneTime: z.object({
			id: z.string(),
			pricing: z.object({}),
			charges: z.object({
				Contribution: z.object({
					id: z.string(),
				}),
			}),
			billingPeriod: z.literal('OneTime'),
		}),
	}),
})`;

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
