// This file defines the products we have which only exist in Stripe, this is currently only
// the Guardian Patron product although this may change in the future. This file is combined
// with the Zuora products to create a full product catalog.
import type {
	Product,
	ProductKey,
} from '@modules/product-catalog/productCatalog';

export const stripeProducts: Partial<Record<ProductKey, Product<ProductKey>>> =
	{
		GuardianPatron: {
			billingSystem: 'stripe',
			active: true,
			ratePlans: {
				GuardianPatron: {
					id: 'guardian_patron',
					// Pricing on Patrons is complicated and we don't use the product catalog to manage it
					pricing: {},
					// Stripe doesn't have charges in the same way as Zuora
					charges: {
						Subscription: { id: 'guardian_patron' },
					},
					billingPeriod: 'Month',
				},
			},
		},
	};

export const stripeProductsSchema = `GuardianPatron: z.object({
	billingSystem: z.literal('stripe'),
	active: z.boolean(),
	ratePlans: z.object({
		GuardianPatron: z.object({
			id: z.string(),
			pricing: z.object({}),
			charges: z.object({
				Subscription: z.object({
					id: z.string(),
				}),
			}),
			billingPeriod: z.literal('Month'),
		}),
	}),
})`;

export const stripeTypeObject = {
	GuardianPatron: {
		billingPeriods: ['Month'],
		productRatePlans: {
			GuardianPatron: {
				Subscription: {},
			},
		},
	},
};
