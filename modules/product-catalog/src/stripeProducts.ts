// This file defines the products we have which only exist in Stripe, this is currently only
// the Guardian Patron product although this may change in the future. This file is combined
// with the Zuora products to create a full product catalog.
import type { Product } from '@modules/product-catalog/productCatalog';
import { getCustomerFacingName } from '@modules/product-catalog/productCatalog';

export type StripeProductKey = 'GuardianPatron' | 'OneTimeContribution';
export const stripeProducts: Partial<
	Record<StripeProductKey, Product<StripeProductKey>>
> = {
	GuardianPatron: {
		billingSystem: 'stripe',
		active: true,
		customerFacingName: getCustomerFacingName('GuardianPatron'),
		isDeliveryProduct: false,
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
				termType: 'Recurring',
				termLengthInMonths: 12,
			},
		},
	},
	OneTimeContribution: {
		billingSystem: 'stripe',
		active: true,
		customerFacingName: getCustomerFacingName('OneTimeContribution'),
		isDeliveryProduct: false,
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
				termType: 'FixedTerm',
				termLengthInMonths: 0,
			},
		},
	},
};

export const stripeProductsSchema = `GuardianPatron: z.object({
	billingSystem: z.literal('stripe'),
	active: z.boolean(),
	customerFacingName: z.string(),
	isDeliveryProduct: z.literal(false),
	ratePlans: z.object({
		GuardianPatron: z.object({
			id: z.string(),
			pricing: z.object({}),
			termLengthInMonths: z.number(),
			termType: termTypeSchema,
			charges: z.object({
				Subscription: z.object({
					id: z.string(),
				}),
			}),
			billingPeriod: z.literal('Month'),
		}),
	}),
}),
OneTimeContribution: z.object({
	billingSystem: z.literal('stripe'),
	active: z.boolean(),
	customerFacingName: z.string(),
	isDeliveryProduct: z.literal(false),
	ratePlans: z.object({
		OneTime: z.object({
			id: z.string(),
			pricing: z.object({}),
			termLengthInMonths: z.number(),
			termType: termTypeSchema,
			charges: z.object({
				Contribution: z.object({
					id: z.string(),
				}),
			}),
			billingPeriod: z.literal('OneTime'),
		}),
	}),
})`;
