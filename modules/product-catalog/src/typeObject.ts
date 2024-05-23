export const typeObject = {
	DigitalSubscription: {
		currencies: ['USD', 'NZD', 'EUR', 'GBP', 'CAD', 'AUD'],
		billingPeriods: ['Quarter', 'Month', 'Annual'],
		productRatePlans: {
			Monthly: {
				Subscription: {},
			},
			Annual: {
				Subscription: {},
			},
			ThreeMonthGift: {
				Subscription: {},
			},
			OneYearGift: {
				Subscription: {},
			},
		},
	},
	NationalDelivery: {
		currencies: ['GBP'],
		billingPeriods: ['Month'],
		productRatePlans: {
			Sixday: {
				Monday: {},
				Tuesday: {},
				Wednesday: {},
				Thursday: {},
				Friday: {},
				Saturday: {},
			},
			Weekend: {
				Saturday: {},
				Sunday: {},
			},
			Everyday: {
				Monday: {},
				Tuesday: {},
				Wednesday: {},
				Thursday: {},
				Friday: {},
				Saturday: {},
				Sunday: {},
			},
		},
	},
	SupporterPlus: {
		currencies: ['USD', 'NZD', 'EUR', 'GBP', 'CAD', 'AUD'],
		billingPeriods: ['Month', 'Annual'],
		productRatePlans: {
			GuardianWeeklyRestOfWorldMonthly: {
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			GuardianWeeklyRestOfWorldAnnual: {
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			GuardianWeeklyDomesticAnnual: {
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			GuardianWeeklyDomesticMonthly: {
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			V1DeprecatedMonthly: {
				Subscription: {},
			},
			V1DeprecatedAnnual: {
				Subscription: {},
			},
			Monthly: {
				Subscription: {},
				Contribution: {},
			},
			Annual: {
				Contribution: {},
				Subscription: {},
			},
		},
	},
	GuardianWeeklyRestOfWorld: {
		currencies: ['USD', 'GBP'],
		billingPeriods: ['Month', 'Annual', 'Quarter'],
		productRatePlans: {
			Monthly: {
				Monthly: {},
			},
			OneYearGift: {
				Subscription: {},
			},
			Annual: {
				Subscription: {},
			},
			Quarterly: {
				Subscription: {},
			},
			ThreeMonthGift: {
				Subscription: {},
			},
		},
	},
	GuardianWeeklyDomestic: {
		currencies: ['USD', 'NZD', 'EUR', 'GBP', 'CAD', 'AUD'],
		billingPeriods: ['Annual', 'Quarter', 'Month'],
		productRatePlans: {
			OneYearGift: {
				Subscription: {},
			},
			Annual: {
				Subscription: {},
			},
			Quarterly: {
				Subscription: {},
			},
			Monthly: {
				Subscription: {},
			},
			ThreeMonthGift: {
				Subscription: {},
			},
		},
	},
	SubscriptionCard: {
		currencies: ['GBP'],
		billingPeriods: ['Month'],
		productRatePlans: {
			Sixday: {
				Friday: {},
				Monday: {},
				Tuesday: {},
				Thursday: {},
				Wednesday: {},
				Saturday: {},
			},
			Everyday: {
				Monday: {},
				Tuesday: {},
				Saturday: {},
				Thursday: {},
				Friday: {},
				Wednesday: {},
				Sunday: {},
			},
			Weekend: {
				Saturday: {},
				Sunday: {},
			},
			Sunday: {
				Sunday: {},
			},
			Saturday: {
				Saturday: {},
			},
		},
	},
	Contribution: {
		currencies: ['USD', 'NZD', 'EUR', 'GBP', 'CAD', 'AUD'],
		billingPeriods: ['Annual', 'Month'],
		productRatePlans: {
			Annual: {
				Contribution: {},
			},
			Monthly: {
				Contribution: {},
			},
		},
	},
	HomeDelivery: {
		currencies: ['GBP'],
		billingPeriods: ['Month'],
		productRatePlans: {
			Everyday: {
				Sunday: {},
				Wednesday: {},
				Friday: {},
				Thursday: {},
				Monday: {},
				Tuesday: {},
				Saturday: {},
			},
			Sunday: {
				Sunday: {},
			},
			Sixday: {
				Wednesday: {},
				Friday: {},
				Thursday: {},
				Monday: {},
				Tuesday: {},
				Saturday: {},
			},
			Weekend: {
				Sunday: {},
				Saturday: {},
			},
			Saturday: {
				Saturday: {},
			},
		},
	},
} as const;
