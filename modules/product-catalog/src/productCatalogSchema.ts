import { z } from 'zod';
import { typeObject } from '@modules/product-catalog/productCatalog';

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
				billingPeriod: z
					.enum(typeObject.GuardianPatron.billingPeriods)
					.optional(),
			}),
		}),
	}),
	GuardianAdLite: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({
					GBP: z.number(),
				}),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianAdLite.billingPeriods)
					.optional(),
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
					CAD: z.number(),
					AUD: z.number(),
					EUR: z.number(),
					GBP: z.number(),
					USD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterMembership.billingPeriods)
					.optional(),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({
					GBP: z.number(),
					CAD: z.number(),
					AUD: z.number(),
					EUR: z.number(),
					USD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterMembership.billingPeriods)
					.optional(),
			}),
			V2DeprecatedAnnual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					GBP: z.number(),
					CAD: z.number(),
					EUR: z.number(),
					AUD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterMembership.billingPeriods)
					.optional(),
			}),
			V1DeprecatedAnnual: z.object({
				id: z.string(),
				pricing: z.object({
					GBP: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterMembership.billingPeriods)
					.optional(),
			}),
			V1DeprecatedMonthly: z.object({
				id: z.string(),
				pricing: z.object({
					GBP: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterMembership.billingPeriods)
					.optional(),
			}),
			V2DeprecatedMonthly: z.object({
				id: z.string(),
				pricing: z.object({
					GBP: z.number(),
					USD: z.number(),
					AUD: z.number(),
					EUR: z.number(),
					CAD: z.number(),
				}),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterMembership.billingPeriods)
					.optional(),
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
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(typeObject.PatronMembership.billingPeriods),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(typeObject.PatronMembership.billingPeriods),
			}),
			V1DeprecatedAnnual: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(typeObject.PatronMembership.billingPeriods),
			}),
			V1DeprecatedMonthly: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(typeObject.PatronMembership.billingPeriods),
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
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(typeObject.PartnerMembership.billingPeriods),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(typeObject.PartnerMembership.billingPeriods),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(typeObject.PartnerMembership.billingPeriods),
			}),
			V1DeprecatedMonthly: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z.enum(typeObject.PartnerMembership.billingPeriods),
			}),
		}),
	}),
	DigitalSubscription: z.object({
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
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
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
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
			Sixday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
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
			'Everyday+': z.object({
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
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
			'Sixday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
			'Weekend+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
			'Saturday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
			'Sunday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Sunday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.HomeDelivery.billingPeriods)
					.optional(),
			}),
		}),
	}),
	NationalDelivery: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
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
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NationalDelivery.billingPeriods)
					.optional(),
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
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
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
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
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
			'Everyday+': z.object({
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
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
			}),
			'Sixday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
			}),
			'Weekend+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
			}),
			'Saturday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
			}),
			'Sunday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Sunday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SubscriptionCard.billingPeriods)
					.optional(),
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
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NewspaperVoucher.billingPeriods)
					.optional(),
			}),
			Sixday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NewspaperVoucher.billingPeriods)
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
					.enum(typeObject.NewspaperVoucher.billingPeriods)
					.optional(),
			}),
			Saturday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Saturday: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.NewspaperVoucher.billingPeriods)
					.optional(),
			}),
			Sunday: z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({ Sunday: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.NewspaperVoucher.billingPeriods)
					.optional(),
			}),
			'Everyday+': z.object({
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
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NewspaperVoucher.billingPeriods)
					.optional(),
			}),
			'Sixday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Monday: z.object({ id: z.string() }),
					Tuesday: z.object({ id: z.string() }),
					Wednesday: z.object({ id: z.string() }),
					Thursday: z.object({ id: z.string() }),
					Friday: z.object({ id: z.string() }),
					Saturday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NewspaperVoucher.billingPeriods)
					.optional(),
			}),
			'Weekend+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					Sunday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NewspaperVoucher.billingPeriods)
					.optional(),
			}),
			'Saturday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Saturday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NewspaperVoucher.billingPeriods)
					.optional(),
			}),
			'Sunday+': z.object({
				id: z.string(),
				pricing: z.object({ GBP: z.number() }),
				charges: z.object({
					Sunday: z.object({ id: z.string() }),
					DigitalPack: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.NewspaperVoucher.billingPeriods)
					.optional(),
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
					Subscription: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
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
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
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
		}),
	}),
	TierThree: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			RestOfWorldMonthly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					GBP: z.number(),
				}),
				charges: z.object({
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
			}),
			RestOfWorldAnnual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					GBP: z.number(),
				}),
				charges: z.object({
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
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
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
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
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
			}),
			RestOfWorldMonthlyV2: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					GBP: z.number(),
				}),
				charges: z.object({
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
					NewspaperArchive: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
			}),
			RestOfWorldAnnualV2: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					GBP: z.number(),
				}),
				charges: z.object({
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
					NewspaperArchive: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
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
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
					NewspaperArchive: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
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
					SupporterPlus: z.object({ id: z.string() }),
					GuardianWeekly: z.object({ id: z.string() }),
					NewspaperArchive: z.object({ id: z.string() }),
				}),
				billingPeriod: z
					.enum(typeObject.SupporterPlus.billingPeriods)
					.optional(),
			}),
		}),
	}),
	GuardianWeeklyRestOfWorld: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
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
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
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
	GuardianWeeklyZoneA: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Quarterly: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					GBP: z.number(),
				}),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyZoneA.billingPeriods)
					.optional(),
			}),
			Annual: z.object({
				id: z.string(),
				pricing: z.object({
					USD: z.number(),
					GBP: z.number(),
				}),
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyZoneA.billingPeriods)
					.optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyZoneB.billingPeriods)
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
					.enum(typeObject.GuardianWeeklyZoneB.billingPeriods)
					.optional(),
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
				charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.GuardianWeeklyZoneC.billingPeriods)
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
					.enum(typeObject.GuardianWeeklyZoneC.billingPeriods)
					.optional(),
			}),
		}),
	}),
	Contribution: z.object({
		billingSystem: z.literal('zuora'),
		active: z.boolean(),
		ratePlans: z.object({
			Annual: z.object({
				id: z.string(),
				pricing: z.object({}),
				charges: z.object({ Contribution: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.Contribution.billingPeriods)
					.optional(),
			}),
			Monthly: z.object({
				id: z.string(),
				pricing: z.object({}),
				charges: z.object({ Contribution: z.object({ id: z.string() }) }),
				billingPeriod: z
					.enum(typeObject.Contribution.billingPeriods)
					.optional(),
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
				charges: z.object({ Contribution: z.object({ id: z.string() }) }),
			}),
		}),
	}),
});
