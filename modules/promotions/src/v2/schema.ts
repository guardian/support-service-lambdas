import { isoCountrySchema } from '@modules/internationalisation/schemas';
import { z } from 'zod';

export const promoProductSchema = z.enum([
	'SupporterPlus',
	'TierThree',
	'DigitalSubscription',
	'Newspaper',
	'Weekly',
]);

export const promoCampaignSchema = z.object({
	campaignCode: z.string(),
	product: promoProductSchema,
	name: z.string(),
	created: z.string(),
});

export type PromoCampaign = z.infer<typeof promoCampaignSchema>;

export const appliesToSchema = z.object({
	productRatePlanIds: z.array(z.string()),
	countryGroups: z.array(isoCountrySchema),
});

export const discountDetailsSchema = z.object({
	amount: z.number(),
	durationMonths: z.number(),
});

export const landingPageSchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	roundelHtml: z.string().optional(),
});

export const promoSchema = z.object({
	promoCode: z.string(),
	name: z.string(),
	campaignCode: z.string(),
	appliesTo: appliesToSchema,
	startTimestamp: z.coerce.date(),
	endTimestamp: z.coerce.date().optional(),
	discount: discountDetailsSchema.optional(),
	description: z.string().optional(),
	landingPage: landingPageSchema.optional(),
});

export type Promo = z.infer<typeof promoSchema>;
