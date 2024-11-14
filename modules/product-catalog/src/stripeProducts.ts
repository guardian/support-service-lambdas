export const stripeProducts = {
	GuardianPatron: {
		billingSystem: 'stripe',
		ratePlans: {
			GuardianPatron: {
				id: 'guardian_patron',
				pricing: {
					GBP: 0,
					USD: 0,
					NZD: 0,
					EUR: 0,
					AUD: 0,
					CAD: 0,
				},
				charges: {
					GuardianPatron: { id: 'guardian_patron' },
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
				GuardianPatron: {},
			},
		},
	},
};
