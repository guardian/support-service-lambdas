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
					// Pricing on Patrons is complicated and we don't use the product catalog
					// to manage it so leave this as 0 for now
					pricing: {
						GBP: 0,
						USD: 0,
						NZD: 0,
						EUR: 0,
						AUD: 0,
						CAD: 0,
					},
					// Stripe doesn't have charges in the same way as Zuora
					charges: {
						Subscription: { id: 'guardian_patron' },
					},
					billingPeriod: 'Month',
				},
			},
		},
	};

export const stripeTypeObject = {
	GuardianPatron: {
		currencies: ['NZD', 'CAD', 'AUD', 'USD', 'GBP', 'EUR'],
		billingPeriods: ['Month'],
		productRatePlans: {
			GuardianPatron: {
				Subscription: {},
			},
		},
	},
};
