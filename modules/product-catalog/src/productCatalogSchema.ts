import { z } from 'zod';

export const productCatalogSchema = z.object({
	products: z.object({
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
				}),
				Weekend: z.object({
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					charges: z.object({
						Saturday: z.object({ id: z.string() }),
						Sunday: z.object({ id: z.string() }),
					}),
				}),
				Saturday: z.object({
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					charges: z.object({ Saturday: z.object({ id: z.string() }) }),
				}),
				Sunday: z.object({
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					charges: z.object({ Sunday: z.object({ id: z.string() }) }),
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
				}),
				Weekend: z.object({
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					charges: z.object({
						Saturday: z.object({ id: z.string() }),
						Sunday: z.object({ id: z.string() }),
					}),
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
				}),
			}),
		}),
		GuardianWeeklyRestOfWorld: z.object({
			ratePlans: z.object({
				ThreeMonthGift: z.object({
					id: z.string(),
					pricing: z.object({ USD: z.number(), GBP: z.number() }),
					charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				}),
				OneYearGift: z.object({
					id: z.string(),
					pricing: z.object({ USD: z.number(), GBP: z.number() }),
					charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				}),
				SixWeekly: z.object({
					id: z.string(),
					pricing: z.object({ USD: z.number(), GBP: z.number() }),
					charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				}),
				Quarterly: z.object({
					id: z.string(),
					pricing: z.object({ USD: z.number(), GBP: z.number() }),
					charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				}),
				Annual: z.object({
					id: z.string(),
					pricing: z.object({ USD: z.number(), GBP: z.number() }),
					charges: z.object({ Subscription: z.object({ id: z.string() }) }),
				}),
				Monthly: z.object({
					id: z.string(),
					pricing: z.object({ USD: z.number(), GBP: z.number() }),
					charges: z.object({ Monthly: z.object({ id: z.string() }) }),
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
				}),
				SixWeekly: z.object({
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
				}),
				Weekend: z.object({
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					charges: z.object({
						Saturday: z.object({ id: z.string() }),
						Sunday: z.object({ id: z.string() }),
					}),
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
				}),
				Sunday: z.object({
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					charges: z.object({ Sunday: z.object({ id: z.string() }) }),
				}),
				Saturday: z.object({
					id: z.string(),
					pricing: z.object({ GBP: z.number() }),
					charges: z.object({ Saturday: z.object({ id: z.string() }) }),
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
				}),
			}),
		}),
	}),
});
