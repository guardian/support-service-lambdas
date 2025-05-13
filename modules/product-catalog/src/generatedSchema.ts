import { z } from 'zod';

export const productCatalogSchema = z.object({
	GuardianPatron: z.object({
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
	}),
	OneTimeContribution: z.object({
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
	}),
	GuardianAdLite: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
	TierThree: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			RestOfWorldAnnualV2: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({
					NewspaperArchive: z.object({
						id: z.string(),
					}),
					SupporterPlus: z.object({
						id: z.string(),
					}),
					GuardianWeekly: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			RestOfWorldMonthlyV2: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({
					SupporterPlus: z.object({
						id: z.string(),
					}),
					GuardianWeekly: z.object({
						id: z.string(),
					}),
					NewspaperArchive: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			DomesticAnnualV2: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					NewspaperArchive: z.object({
						id: z.string(),
					}),
					SupporterPlus: z.object({
						id: z.string(),
					}),
					GuardianWeekly: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			DomesticMonthlyV2: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					SupporterPlus: z.object({
						id: z.string(),
					}),
					GuardianWeekly: z.object({
						id: z.string(),
					}),
					NewspaperArchive: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			RestOfWorldMonthly: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({
					SupporterPlus: z.object({
						id: z.string(),
					}),
					GuardianWeekly: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			RestOfWorldAnnual: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({
					SupporterPlus: z.object({
						id: z.string(),
					}),
					GuardianWeekly: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			DomesticAnnual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					SupporterPlus: z.object({
						id: z.string(),
					}),
					GuardianWeekly: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			DomesticMonthly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					SupporterPlus: z.object({
						id: z.string(),
					}),
					GuardianWeekly: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
	DigitalSubscription: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Quarterly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Quarter'),
			}),
			ThreeMonthGift: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
			}),
			OneYearGift: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
			}),
		}),
	}),
	NationalDelivery: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Sixday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Everyday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
	SupporterMembership: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Annual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			V2DeprecatedAnnual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			V1DeprecatedAnnual: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			V1DeprecatedMonthly: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			V2DeprecatedMonthly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
	SupporterPlus: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			V1DeprecatedMonthly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			V1DeprecatedAnnual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
					Contribution: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Contribution: z.object({
						id: z.string(),
					}),
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
		}),
	}),
	GuardianWeeklyRestOfWorld: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({
					Monthly: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			OneYearGift: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Quarterly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Quarter'),
			}),
			ThreeMonthGift: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Quarter'),
			}),
		}),
	}),
	GuardianWeeklyDomestic: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			OneYearGift: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Quarterly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Quarter'),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			ThreeMonthGift: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Quarter'),
			}),
		}),
	}),
	SubscriptionCard: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Everyday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Sixday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Friday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Sunday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Saturday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Everyday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Sixday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Sunday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Weekend+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Saturday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
	Contribution: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Annual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Contribution: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Contribution: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
	GuardianWeeklyZoneA: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Annual: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Quarterly: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Quarter'),
			}),
		}),
	}),
	GuardianWeeklyZoneB: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Quarterly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Quarter'),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
		}),
	}),
	GuardianWeeklyZoneC: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Quarterly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Quarter'),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					NZD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
		}),
	}),
	NewspaperVoucher: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Everyday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Everyday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Sixday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Friday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Sixday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Weekend+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Sunday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Sunday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Saturday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Saturday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
	HomeDelivery: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Everyday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Sunday: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Sixday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Wednesday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Sunday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Sunday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Saturday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Everyday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Weekend+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Sixday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Wednesday: z.object({
						id: z.string(),
					}),
					Friday: z.object({
						id: z.string(),
					}),
					Thursday: z.object({
						id: z.string(),
					}),
					Monday: z.object({
						id: z.string(),
					}),
					Tuesday: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Sunday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Sunday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			'Saturday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					DigitalPack: z.object({
						id: z.string(),
					}),
					Saturday: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
	PatronMembership: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			V1DeprecatedAnnual: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			V1DeprecatedMonthly: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
	PartnerMembership: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			V1DeprecatedAnnual: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Annual'),
			}),
			V1DeprecatedMonthly: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				billingPeriod: z.literal('Month'),
			}),
		}),
	}),
});
