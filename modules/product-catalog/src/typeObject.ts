export const activeTypeObject = {
	OneTimeContribution: {
		billingPeriods: ['OneTime'],
		productRatePlans: {
			OneTime: {
				Contribution: {},
			},
		},
	},
	GuardianAdLite: {
		billingPeriods: ['Month'],
		productRatePlans: {
			Monthly: {
				Subscription: {},
			},
		},
	},
	TierThree: {
		billingPeriods: ['Annual', 'Month'],
		productRatePlans: {
			RestOfWorldAnnualV2: {
				NewspaperArchive: {},
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			RestOfWorldMonthlyV2: {
				SupporterPlus: {},
				GuardianWeekly: {},
				NewspaperArchive: {},
			},
			DomesticAnnualV2: {
				NewspaperArchive: {},
				SupporterPlus: {},
				GuardianWeekly: {},
			},
			DomesticMonthlyV2: {
				SupporterPlus: {},
				GuardianWeekly: {},
				NewspaperArchive: {},
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
		billingPeriods: ['Month', 'Annual'],
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
		billingPeriods: ['Month'],
		productRatePlans: {
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
			Sixday: {
				Friday: {},
				Monday: {},
				Tuesday: {},
				Thursday: {},
				Wednesday: {},
				Saturday: {},
			},
			Sunday: {
				Sunday: {},
			},
			Saturday: {
				Saturday: {},
			},
			EverydayPlus: {
				DigitalPack: {},
				Saturday: {},
				Tuesday: {},
				Monday: {},
				Thursday: {},
				Wednesday: {},
				Sunday: {},
				Friday: {},
			},
			SixdayPlus: {
				DigitalPack: {},
				Thursday: {},
				Wednesday: {},
				Friday: {},
				Saturday: {},
				Monday: {},
				Tuesday: {},
			},
			SundayPlus: {
				DigitalPack: {},
				Sunday: {},
			},
			WeekendPlus: {
				DigitalPack: {},
				Saturday: {},
				Sunday: {},
			},
			SaturdayPlus: {
				DigitalPack: {},
				Saturday: {},
			},
		},
	},
	Contribution: {
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
			Sunday: {
				Sunday: {},
			},
			Saturday: {
				Saturday: {},
			},
			EverydayPlus: {
				DigitalPack: {},
				Wednesday: {},
				Friday: {},
				Thursday: {},
				Sunday: {},
				Monday: {},
				Tuesday: {},
				Saturday: {},
			},
			WeekendPlus: {
				DigitalPack: {},
				Sunday: {},
				Saturday: {},
			},
			SixdayPlus: {
				DigitalPack: {},
				Wednesday: {},
				Friday: {},
				Thursday: {},
				Monday: {},
				Tuesday: {},
				Saturday: {},
			},
			SundayPlus: {
				DigitalPack: {},
				Sunday: {},
			},
			SaturdayPlus: {
				DigitalPack: {},
				Saturday: {},
			},
		},
	},
	GuardianPatron: {
		billingPeriods: ['Month'],
		productRatePlans: {
			GuardianPatron: {
				Subscription: {},
			},
		},
	},
} as const;
export const inactiveTypeObject = {
	SupporterMembership: {
		billingPeriods: ['Annual', 'Month'],
		productRatePlans: {
			Annual: {
				Subscription: {},
			},
			Monthly: {
				Subscription: {},
			},
			V2DeprecatedAnnual: {
				Subscription: {},
			},
			V1DeprecatedAnnual: {
				Subscription: {},
			},
			V1DeprecatedMonthly: {
				Subscription: {},
			},
			V2DeprecatedMonthly: {
				Subscription: {},
			},
		},
	},
	GuardianWeeklyZoneA: {
		billingPeriods: [
			'Annual',
			'Three_Years',
			'Semi_Annual',
			'Two_Years',
			'Quarter',
		],
		productRatePlans: {
			Annual: {
				Subscription: {},
			},
			Quarterly: {
				Subscription: {},
			},
		},
	},
	GuardianWeeklyZoneB: {
		billingPeriods: [
			'Annual',
			'Three_Years',
			'Two_Years',
			'Semi_Annual',
			'Quarter',
		],
		productRatePlans: {
			Quarterly: {
				Subscription: {},
			},
			Annual: {
				Subscription: {},
			},
		},
	},
	GuardianWeeklyZoneC: {
		billingPeriods: ['Semi_Annual', 'Annual', 'Quarter'],
		productRatePlans: {
			Quarterly: {
				Subscription: {},
			},
			Annual: {
				Subscription: {},
			},
		},
	},
	NewspaperVoucher: {
		billingPeriods: ['Month'],
		productRatePlans: {
			Everyday: {
				Monday: {},
				Tuesday: {},
				Saturday: {},
				Thursday: {},
				Friday: {},
				Wednesday: {},
				Sunday: {},
			},
			EverydayPlus: {
				DigitalPack: {},
				Saturday: {},
				Tuesday: {},
				Monday: {},
				Thursday: {},
				Wednesday: {},
				Sunday: {},
				Friday: {},
			},
			Sixday: {
				Friday: {},
				Monday: {},
				Tuesday: {},
				Thursday: {},
				Wednesday: {},
				Saturday: {},
			},
			SixdayPlus: {
				DigitalPack: {},
				Thursday: {},
				Wednesday: {},
				Friday: {},
				Saturday: {},
				Monday: {},
				Tuesday: {},
			},
			Weekend: {
				Saturday: {},
				Sunday: {},
			},
			WeekendPlus: {
				DigitalPack: {},
				Saturday: {},
				Sunday: {},
			},
			Sunday: {
				Sunday: {},
			},
			SundayPlus: {
				DigitalPack: {},
				Sunday: {},
			},
			Saturday: {
				Saturday: {},
			},
			SaturdayPlus: {
				DigitalPack: {},
				Saturday: {},
			},
		},
	},
	PatronMembership: {
		billingPeriods: ['Month', 'Annual'],
		productRatePlans: {
			Monthly: {
				Subscription: {},
			},
			Annual: {
				Subscription: {},
			},
			V1DeprecatedAnnual: {
				Subscription: {},
			},
			V1DeprecatedMonthly: {
				Subscription: {},
			},
		},
	},
	PartnerMembership: {
		billingPeriods: ['Annual', 'Month'],
		productRatePlans: {
			V1DeprecatedAnnual: {
				Subscription: {},
			},
			Monthly: {
				Subscription: {},
			},
			Annual: {
				Subscription: {},
			},
			V1DeprecatedMonthly: {
				Subscription: {},
			},
		},
	},
} as const;
