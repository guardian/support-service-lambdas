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
			Annual: z.object({
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
			}),
			Monthly: z.object({
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
			}),
		}),
	}),
	DigitalSubscription: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z.object({
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
			Monthly: z.object({
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
			OneYearGift: z.object({
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
			Quarterly: z.object({
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
			}),
			ThreeMonthGift: z.object({
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
	GuardianAdLite: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Monthly: z.object({
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
			Annual: z.object({
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
			Monthly: z.object({
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
			OneYearGift: z.object({
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
			Quarterly: z.object({
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
			}),
			ThreeMonthGift: z.object({
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
			}),
		}),
	}),
	GuardianWeeklyRestOfWorld: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: z.object({
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
			}),
			Monthly: z.object({
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
			}),
			OneYearGift: z.object({
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
			}),
			Quarterly: z.object({
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
			}),
			ThreeMonthGift: z.object({
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
			}),
		}),
	}),
	GuardianWeeklyZoneA: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: z.object({
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
			}),
			Quarterly: z.object({
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
			}),
		}),
	}),
	GuardianWeeklyZoneB: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: z.object({
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
			Quarterly: z.object({
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
			}),
		}),
	}),
	GuardianWeeklyZoneC: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Annual: z.object({
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
			Quarterly: z.object({
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
			}),
		}),
	}),
	HomeDelivery: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Everyday: z.object({
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
			EverydayPlus: z.object({
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
			Saturday: z.object({
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
			SaturdayPlus: z.object({
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
			Sixday: z.object({
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
			SixdayPlus: z.object({
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
			Sunday: z.object({
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
			SundayPlus: z.object({
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
			Weekend: z.object({
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
			WeekendPlus: z.object({
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
	NationalDelivery: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Everyday: z.object({
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
			EverydayPlus: z.object({
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
			Sixday: z.object({
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
			SixdayPlus: z.object({
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
			Weekend: z.object({
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
			WeekendPlus: z.object({
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
	NewspaperVoucher: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Everyday: z.object({
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
			EverydayPlus: z.object({
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
			Saturday: z.object({
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
			SaturdayPlus: z.object({
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
			Sixday: z.object({
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
			SixdayPlus: z.object({
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
			Sunday: z.object({
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
			SundayPlus: z.object({
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
			Weekend: z.object({
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
			WeekendPlus: z.object({
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
			Annual: z.object({
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
			Monthly: z.object({
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
			V1DeprecatedAnnual: z.object({
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
			V1DeprecatedMonthly: z.object({
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
	PatronMembership: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z.object({
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
			Monthly: z.object({
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
			V1DeprecatedAnnual: z.object({
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
			V1DeprecatedMonthly: z.object({
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
	SubscriptionCard: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			Everyday: z.object({
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
			EverydayPlus: z.object({
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
			Saturday: z.object({
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
			SaturdayPlus: z.object({
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
			Sixday: z.object({
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
			SixdayPlus: z.object({
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
			Sunday: z.object({
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
			SundayPlus: z.object({
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
			Weekend: z.object({
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
			WeekendPlus: z.object({
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
	SupporterMembership: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z.object({
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
			Monthly: z.object({
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
			V1DeprecatedAnnual: z.object({
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
			V1DeprecatedMonthly: z.object({
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
			V2DeprecatedAnnual: z.object({
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
			V2DeprecatedMonthly: z.object({
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
	SupporterPlus: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(false),
		ratePlans: z.object({
			Annual: z.object({
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
			Monthly: z.object({
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
			OneYearStudent: z.object({
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
			V1DeprecatedAnnual: z.object({
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
			V1DeprecatedMonthly: z.object({
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
	TierThree: z.object({
		active: z.boolean(),
		billingSystem: z.literal('zuora'),
		customerFacingName: z.string(),
		isDeliveryProduct: z.literal(true),
		ratePlans: z.object({
			DomesticAnnual: z.object({
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
			DomesticAnnualV2: z.object({
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
			DomesticMonthly: z.object({
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
			DomesticMonthlyV2: z.object({
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
			RestOfWorldAnnual: z.object({
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
			RestOfWorldAnnualV2: z.object({
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
			RestOfWorldMonthly: z.object({
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
			RestOfWorldMonthlyV2: z.object({
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
