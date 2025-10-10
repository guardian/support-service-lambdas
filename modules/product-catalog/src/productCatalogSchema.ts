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

export type GenericProductCatalog = Record<
	string,
	z.infer<typeof baseProductSchema>
>;

const baseRatePlanSchema = z.object({
	id: z.string(),
	charges: z.record(
		z.string(),
		z.object({
			id: z.string(),
		}),
	),
	pricing: z.record(z.string(), z.number()),
	termLengthInMonths: z.number(),
	termType: termTypeSchema,
});

const baseProductSchema = z.object({
	active: z.boolean(),
	billingSystem: z.enum(['zuora', 'stripe']),
	customerFacingName: z.string(),
	isDeliveryProduct: z.boolean(),
	ratePlans: z.record(z.string(), baseRatePlanSchema),
});

export const productCatalogSchema = z.object({
	Contribution: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Annual'),
				charges: z.object({
					Contribution: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			Monthly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Month'),
				charges: z.object({
					Contribution: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
		}),
	}),
	DigitalSubscription: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Annual'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			Monthly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Month'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			OneYearGift: baseRatePlanSchema.extend({
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			Quarterly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Quarter'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			ThreeMonthGift: baseRatePlanSchema.extend({
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
		}),
	}),
	GuardianAdLite: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Monthly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Month'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({ GBP: z.number() }),
			}),
		}),
	}),
	GuardianPatron: baseProductSchema.extend({
		billingSystem: z.literal('stripe'),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			GuardianPatron: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Month'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({}),
			}),
		}),
	}),
	GuardianWeeklyDomestic: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Annual'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			Monthly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Month'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			OneYearGift: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Annual'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			Quarterly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Quarter'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			ThreeMonthGift: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Quarter'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
		}),
	}),
	GuardianWeeklyRestOfWorld: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Annual'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({ GBP: z.number(), USD: z.number() }),
			}),
			Monthly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Month'),
				charges: z.object({
					Monthly: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({ GBP: z.number(), USD: z.number() }),
			}),
			OneYearGift: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Annual'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({ GBP: z.number(), USD: z.number() }),
			}),
			Quarterly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Quarter'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({ GBP: z.number(), USD: z.number() }),
			}),
			ThreeMonthGift: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Quarter'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({ GBP: z.number(), USD: z.number() }),
			}),
		}),
	}),
	GuardianWeeklyZoneA: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Annual'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({ GBP: z.number(), USD: z.number() }),
			}),
			Quarterly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Quarter'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({ GBP: z.number(), USD: z.number() }),
			}),
		}),
	}),
	GuardianWeeklyZoneB: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Annual'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			Quarterly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Quarter'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
		}),
	}),
	GuardianWeeklyZoneC: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Annual'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
			Quarterly: baseRatePlanSchema.extend({
				billingPeriod: z.literal('Quarter'),
				charges: z.object({
					Subscription: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({
					AUD: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					NZD: z.number(),
					USD: z.number(),
				}),
			}),
		}),
	}),
	HomeDelivery: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Everyday: baseRatePlanSchema.extend({
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
			}),
			EverydayPlus: baseRatePlanSchema.extend({
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
			}),
			Saturday: baseRatePlanSchema.extend({
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
			}),
			SaturdayPlus: baseRatePlanSchema.extend({
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
			}),
			Sixday: baseRatePlanSchema.extend({
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
			}),
			SixdayPlus: baseRatePlanSchema.extend({
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
			}),
			Sunday: baseRatePlanSchema.extend({
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
			}),
			SundayPlus: baseRatePlanSchema.extend({
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
			}),
			Weekend: baseRatePlanSchema.extend({
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
			}),
			WeekendPlus: baseRatePlanSchema.extend({
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
			}),
		}),
	}),
	NationalDelivery: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Everyday: baseRatePlanSchema.extend({
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
			}),
			EverydayPlus: baseRatePlanSchema.extend({
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
			}),
			Sixday: baseRatePlanSchema.extend({
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
			}),
			SixdayPlus: baseRatePlanSchema.extend({
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
			}),
			Weekend: baseRatePlanSchema.extend({
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
			}),
			WeekendPlus: baseRatePlanSchema.extend({
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
			}),
		}),
	}),
	NewspaperVoucher: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Everyday: baseRatePlanSchema.extend({
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
			}),
			EverydayPlus: baseRatePlanSchema.extend({
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
			}),
			Saturday: baseRatePlanSchema.extend({
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
			}),
			SaturdayPlus: baseRatePlanSchema.extend({
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
			}),
			Sixday: baseRatePlanSchema.extend({
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
			}),
			SixdayPlus: baseRatePlanSchema.extend({
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
			}),
			Sunday: baseRatePlanSchema.extend({
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
			}),
			SundayPlus: baseRatePlanSchema.extend({
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
			}),
			Weekend: baseRatePlanSchema.extend({
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
			}),
			WeekendPlus: baseRatePlanSchema.extend({
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
			}),
		}),
	}),
	OneTimeContribution: baseProductSchema.extend({
		billingSystem: z.literal('stripe'),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			OneTime: baseRatePlanSchema.extend({
				billingPeriod: z.literal('OneTime'),
				charges: z.object({
					Contribution: z.object({
						id: z.string(),
					}),
				}),
				pricing: z.object({}),
			}),
		}),
	}),
	PartnerMembership: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
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
			}),
			Monthly: baseRatePlanSchema.extend({
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
			}),
			V1DeprecatedAnnual: baseRatePlanSchema.extend({
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
			}),
			V1DeprecatedMonthly: baseRatePlanSchema.extend({
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
			}),
		}),
	}),
	PatronMembership: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
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
			}),
			Monthly: baseRatePlanSchema.extend({
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
			}),
			V1DeprecatedAnnual: baseRatePlanSchema.extend({
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
			}),
			V1DeprecatedMonthly: baseRatePlanSchema.extend({
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
			}),
		}),
	}),
	SubscriptionCard: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Everyday: baseRatePlanSchema.extend({
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
			}),
			EverydayPlus: baseRatePlanSchema.extend({
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
			}),
			Saturday: baseRatePlanSchema.extend({
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
			}),
			SaturdayPlus: baseRatePlanSchema.extend({
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
			}),
			Sixday: baseRatePlanSchema.extend({
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
			}),
			SixdayPlus: baseRatePlanSchema.extend({
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
			}),
			Sunday: baseRatePlanSchema.extend({
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
			}),
			SundayPlus: baseRatePlanSchema.extend({
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
			}),
			Weekend: baseRatePlanSchema.extend({
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
			}),
			WeekendPlus: baseRatePlanSchema.extend({
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
			}),
		}),
	}),
	SupporterMembership: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
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
			}),
			Monthly: baseRatePlanSchema.extend({
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
			}),
			V1DeprecatedAnnual: baseRatePlanSchema.extend({
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
			}),
			V1DeprecatedMonthly: baseRatePlanSchema.extend({
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
			}),
			V2DeprecatedAnnual: baseRatePlanSchema.extend({
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
			}),
			V2DeprecatedMonthly: baseRatePlanSchema.extend({
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
			}),
		}),
	}),
	SupporterPlus: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: baseRatePlanSchema.extend({
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
			}),
			Monthly: baseRatePlanSchema.extend({
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
			}),
			OneYearStudent: baseRatePlanSchema.extend({
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
			}),
			V1DeprecatedAnnual: baseRatePlanSchema.extend({
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
			}),
			V1DeprecatedMonthly: baseRatePlanSchema.extend({
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
			}),
		}),
	}),
	TierThree: baseProductSchema.extend({
		billingSystem: z.literal('zuora'),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			DomesticAnnual: baseRatePlanSchema.extend({
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
			}),
			DomesticAnnualV2: baseRatePlanSchema.extend({
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
			}),
			DomesticMonthly: baseRatePlanSchema.extend({
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
			}),
			DomesticMonthlyV2: baseRatePlanSchema.extend({
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
			}),
			RestOfWorldAnnual: baseRatePlanSchema.extend({
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
			}),
			RestOfWorldAnnualV2: baseRatePlanSchema.extend({
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
			}),
			RestOfWorldMonthly: baseRatePlanSchema.extend({
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
			}),
			RestOfWorldMonthlyV2: baseRatePlanSchema.extend({
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
			}),
		}),
	}),
});
