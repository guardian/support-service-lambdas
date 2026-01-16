import { optionalDropNulls } from '@modules/schemaUtils';
import {
	isoCountrySchema,
	supportRegionSchema,
} from '@modules/internationalisation/schemas';
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
	countries: z.array(isoCountrySchema),
});

export const discountDetailsSchema = z.object({
	amount: z.number(),
	durationMonths: z.number(),
});

export const landingPageSchema = z.object({
	title: optionalDropNulls(z.string()),
	description: optionalDropNulls(z.string()),
	roundelHtml: optionalDropNulls(z.string()),
});

export const promoSchema = z.object({
	promoCode: z.string(),
	name: z.string(),
	campaignCode: z.string(),
	appliesTo: appliesToSchema,
	startTimestamp: z.string(),
	endTimestamp: optionalDropNulls(z.string()),
	discount: optionalDropNulls(discountDetailsSchema),
	description: optionalDropNulls(z.string()),
	landingPage: optionalDropNulls(landingPageSchema),
});

export type Promo = z.infer<typeof promoSchema>;

export const appliedPromotionSchema = z.object({
	promoCode: z.string(),
	supportRegionId: supportRegionSchema,
});
export type AppliedPromotion = z.infer<typeof appliedPromotionSchema>;
