export const typeObject = {
	TierThree: {
		currencies: ['USD', 'GBP'],
		billingPeriods: ['Month', 'Annual'],
		productRatePlans: {
			DomesticMonthlyV2: {
				SupporterPlus: {},
				GuardianWeekly: {},
				NewspaperArchive: {},
			},
			DomesticAnnualV2: {
				NewspaperArchive: {},
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			RestOfWorldMonthlyV2: {
				SupporterPlus: {},
				GuardianWeekly: {},
				NewspaperArchive: {},
			},
			RestOfWorldAnnualV2: {
				NewspaperArchive: {},
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			RestOfWorldMonthly: {
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			RestOfWorldAnnual: {
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			DomesticAnnual: {
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			DomesticMonthly: {
				SupporterPlus: {},
				GuardianWeekly: {},
			},
		},
	},
	DigitalSubscription: {
		currencies: ['NZD', 'CAD', 'AUD', 'USD', 'GBP', 'EUR'],
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
		currencies: ['GBP', 'USD', 'AUD', 'EUR', 'NZD', 'CAD'],
		billingPeriods: ['Month', 'Annual'],
		productRatePlans: {
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
		currencies: ['GBP', 'USD'],
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
		currencies: ['GBP', 'USD', 'NZD', 'EUR', 'CAD', 'AUD'],
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
		currencies: ['GBP', 'USD', 'NZD', 'EUR', 'CAD', 'AUD'],
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
