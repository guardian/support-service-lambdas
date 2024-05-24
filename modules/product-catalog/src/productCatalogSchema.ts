import { z } from 'zod';
import { typeObject } from '@modules/product-catalog/typeObject';

export const productCatalogSchema = z.object({
	DigitalSubscription: z.object({
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.DigitalSubscription.billingPeriods)
					.optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.DigitalSubscription.billingPeriods)
					.optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.DigitalSubscription.billingPeriods)
					.optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.DigitalSubscription.billingPeriods)
					.optional(),
			}),
		}),
	}),
	HomeDelivery: z.object({
		ratePlans: z.object({
			Everyday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Monday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
			Sixday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Friday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Monday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
			Saturday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Saturday: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
			Sunday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Sunday: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
		}),
	}),
	NationalDelivery: z.object({
		ratePlans: z.object({
			Everyday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NationalDelivery.billingPeriods)
					.optional(),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NationalDelivery.billingPeriods)
					.optional(),
			}),
			Sixday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Thursday: z.object({ id: z.string() }),
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NationalDelivery.billingPeriods)
					.optional(),
			}),
		}),
	}),
	SupporterPlus: z.object({
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
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
					Subscription: z.object({ id: z.string() }),
					Contribution: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
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
					Subscription: z.object({ id: z.string() }),
					Contribution: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
			}),
			GuardianWeeklyRestOfWorldMonthly: z.object({
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
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
			}),
			GuardianWeeklyDomesticMonthly: z.object({
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
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
			}),
			GuardianWeeklyRestOfWorldAnnual: z.object({
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
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
			}),
			GuardianWeeklyDomesticAnnual: z.object({
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
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
			}),
		}),
	}),
	GuardianWeeklyRestOfWorld: z.object({
		ratePlans: z.object({
			ThreeMonthGift: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyRestOfWorld.billingPeriods)
					.optional(),
			}),
			OneYearGift: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyRestOfWorld.billingPeriods)
					.optional(),
			}),
			Quarterly: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyRestOfWorld.billingPeriods)
					.optional(),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyRestOfWorld.billingPeriods)
					.optional(),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Monthly: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyRestOfWorld.billingPeriods)
					.optional(),
			}),
		}),
	}),
	GuardianWeeklyDomestic: z.object({
		ratePlans: z.object({
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyDomestic.billingPeriods)
					.optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyDomestic.billingPeriods)
					.optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyDomestic.billingPeriods)
					.optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyDomestic.billingPeriods)
					.optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyDomestic.billingPeriods)
					.optional(),
			}),
		}),
	}),
	SubscriptionCard: z.object({
		ratePlans: z.object({
			Everyday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
			}),
			Sixday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Monday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
			}),
			Sunday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Sunday: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
			}),
			Saturday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Saturday: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
			}),
		}),
	}),
	Contribution: z.object({
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
				charges: z.object({ Contribution: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.Contribution.billingPeriods)
					.optional(),
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
				charges: z.object({ Contribution: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.Contribution.billingPeriods)
					.optional(),
			}),
		}),
	}),
});
