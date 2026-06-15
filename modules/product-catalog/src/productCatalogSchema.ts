// ---------- This file is auto-generated. Do not edit manually. -------------

import { z } from 'zod';

export const productKeys = [
	'Contribution',
	'DigitalSubscription',
	'GuardianAdLite',
	'GuardianWeeklyDomestic',
	'GuardianWeeklyRestOfWorld',
	'GuardianWeeklyZoneA',
	'GuardianWeeklyZoneB',
	'GuardianWeeklyZoneC',
	'HomeDelivery',
	'NationalDelivery',
	'NewspaperVoucher',
	'PartnerMembership',
	'PatronMembership',
	'SubscriptionCard',
	'SupporterMembership',
	'SupporterPlus',
	'TierThree',
] as const;
export const productKeySchema = z.enum(productKeys);
export const termTypeSchema = z.enum(['Recurring', 'FixedTerm']);

export const productCatalogSchema = z.object({
	Contribution: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Contribution: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Monthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Contribution: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	DigitalSubscription: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			AnnualTaxExclusive: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ CAD: z.number(), GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Monthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			MonthlyTaxExclusive: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ CAD: z.number(), GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			OneYearGift: z
				.object({
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),

					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Quarterly: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			ThreeMonthGift: z
				.object({
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),

					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	GuardianAdLite: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Monthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ EUR: z.number(), GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	GuardianPatron: z.object({
		active: z.boolean(),
		billingSystem: z.literal('stripe'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			GuardianPatron: z.object({
				billingPeriod: z.literal('Month'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				id: z.string(),
				pricing: z.object({}),
				termLengthInMonths: z.number(),
				termType: termTypeSchema,
			}),
		}),
	}),
	GuardianWeeklyDomestic: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			AnnualPlus: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						GuardianWeekly: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Monthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			MonthlyPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						GuardianWeekly: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			OneYearGift: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Quarterly: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			QuarterlyPlus: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						GuardianWeekly: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			ThreeMonthGift: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	GuardianWeeklyRestOfWorld: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			AnnualPlus: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						GuardianWeekly: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Monthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Monthly: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			MonthlyPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						GuardianWeekly: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			OneYearGift: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Quarterly: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			QuarterlyPlus: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						GuardianWeekly: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			ThreeMonthGift: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	GuardianWeeklyZoneA: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Quarterly: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	GuardianWeeklyZoneB: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Quarterly: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	GuardianWeeklyZoneC: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Quarterly: z
				.object({
					billingPeriod: z.literal('Quarter'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	HomeDelivery: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Everyday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			EverydayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Saturday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Saturday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SaturdayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Sixday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SixdayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Sunday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SundayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Weekend: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			WeekendPlus: z
				.object({
					billingPeriod: z.literal('Month'),
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
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	NationalDelivery: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Everyday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			EverydayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Sixday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SixdayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Weekend: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			WeekendPlus: z
				.object({
					billingPeriod: z.literal('Month'),
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
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	NewspaperVoucher: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Everyday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			EverydayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Saturday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Saturday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SaturdayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Sixday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SixdayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Sunday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SundayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Weekend: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			WeekendPlus: z
				.object({
					billingPeriod: z.literal('Month'),
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
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	OneTimeContribution: z.object({
		active: z.boolean(),
		billingSystem: z.literal('stripe'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			OneTime: z.object({
				billingPeriod: z.literal('OneTime'),
				charges: z.object({
					Contribution: z.object({
						id: z.string(),
					}),
				}),
				id: z.string(),
				pricing: z.object({}),
				termLengthInMonths: z.number(),
				termType: termTypeSchema,
			}),
		}),
	}),
	PartnerMembership: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Monthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V1DeprecatedAnnual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V1DeprecatedMonthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	PatronMembership: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Monthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V1DeprecatedAnnual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V1DeprecatedMonthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	SubscriptionCard: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Everyday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			EverydayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Saturday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Saturday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SaturdayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Sixday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SixdayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Friday: z.object({
							id: z.string(),
						}),
						Monday: z.object({
							id: z.string(),
						}),
						Saturday: z.object({
							id: z.string(),
						}),
						Thursday: z.object({
							id: z.string(),
						}),
						Tuesday: z.object({
							id: z.string(),
						}),
						Wednesday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Sunday: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			SundayPlus: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						DigitalPack: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Weekend: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Saturday: z.object({
							id: z.string(),
						}),
						Sunday: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			WeekendPlus: z
				.object({
					billingPeriod: z.literal('Month'),
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
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	SupporterMembership: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Monthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V1DeprecatedAnnual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V1DeprecatedMonthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V2DeprecatedAnnual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V2DeprecatedMonthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	SupporterPlus: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Contribution: z.object({
							id: z.string(),
						}),
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			AnnualTaxExclusive: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Contribution: z.object({
							id: z.string(),
						}),
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ CAD: z.number(), GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			Monthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Contribution: z.object({
							id: z.string(),
						}),
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			MonthlyTaxExclusive: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Contribution: z.object({
							id: z.string(),
						}),
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ CAD: z.number(), GBP: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			OneYearStudent: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V1DeprecatedAnnual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			V1DeprecatedMonthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Subscription: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
	TierThree: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Discount: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						Percentage: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			DomesticAnnual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						GuardianWeekly: z.object({
							id: z.string(),
						}),
						SupporterPlus: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			DomesticAnnualV2: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						GuardianWeekly: z.object({
							id: z.string(),
						}),
						NewspaperArchive: z.object({
							id: z.string(),
						}),
						SupporterPlus: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			DomesticMonthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						GuardianWeekly: z.object({
							id: z.string(),
						}),
						SupporterPlus: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			DomesticMonthlyV2: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						GuardianWeekly: z.object({
							id: z.string(),
						}),
						NewspaperArchive: z.object({
							id: z.string(),
						}),
						SupporterPlus: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({
						AUD: z.number(),
						CAD: z.number(),
						EUR: z.number(),
						GBP: z.number(),
						NZD: z.number(),
						USD: z.number(),
					}),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			RestOfWorldAnnual: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						GuardianWeekly: z.object({
							id: z.string(),
						}),
						SupporterPlus: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			RestOfWorldAnnualV2: z
				.object({
					billingPeriod: z.literal('Annual'),
					charges: z.object({
						GuardianWeekly: z.object({
							id: z.string(),
						}),
						NewspaperArchive: z.object({
							id: z.string(),
						}),
						SupporterPlus: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			RestOfWorldMonthly: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						GuardianWeekly: z.object({
							id: z.string(),
						}),
						SupporterPlus: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
			RestOfWorldMonthlyV2: z
				.object({
					billingPeriod: z.literal('Month'),
					charges: z.object({
						GuardianWeekly: z.object({
							id: z.string(),
						}),
						NewspaperArchive: z.object({
							id: z.string(),
						}),
						SupporterPlus: z.object({
							id: z.string(),
						}),
					}),
					id: z.string(),
					pricing: z.object({ GBP: z.number(), USD: z.number() }),
					termLengthInMonths: z.number(),
					termType: termTypeSchema,
				})
				.optional(),
		}),
	}),
});
