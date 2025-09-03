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
			}),
		}),
	}),
});
