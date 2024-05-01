import { BillingPeriodValues } from '@modules/billingPeriod';
import { z } from 'zod';

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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Saturday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Saturday: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Sunday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Sunday: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
		}),
	}),
	SupporterPlus: z.object({
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
					Subscription: z.object({ id: z.string() }),
					Contribution: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
		}),
	}),
	GuardianWeeklyRestOfWorld: z.object({
		ratePlans: z.object({
			ThreeMonthGift: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			OneYearGift: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Quarterly: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({ USD: z.number(), GBP: z.number() }),
				charges: z.object({ Monthly: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Weekend: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Sunday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Sunday: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
			Saturday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Saturday: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
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
				charges: z.object({ Contribution: z.object({ id: z.string() }) }),
				billingPeriod: z.enum(BillingPeriodValues).optional(),
			}),
		}),
	}),
});
