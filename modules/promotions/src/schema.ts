import {
	isoCountrySchema,
	supportInternationalisationSchema,
} from '@modules/internationalisation/schemas';
import { z } from 'zod';

export const promotionCopySchema = z.object({
	title: z.string().optional(),
	description: z.string().optional(),
	roundelHtml: z.string().optional(),
});

// This is the only promotion type currently supported
export const discountPromotionTypeSchema = z.object({
	name: z.literal('percent_discount'),
	amount: z.number(),
	durationMonths: z.number().optional(), // This should always be present but doesn't seem to be in some old promotions
});

const unsupportedPromotionType = (name: string) =>
	z.object({ name: z.literal(name) });

export const promotionTypeSchema = z.discriminatedUnion('name', [
	discountPromotionTypeSchema,
	// The following promotion types are deprecated and no longer supported
	unsupportedPromotionType('tracking'),
	unsupportedPromotionType('free_trial'),
	unsupportedPromotionType('incentive'),
	unsupportedPromotionType('double'),
	unsupportedPromotionType('retention'),
]);

export const appliesToSchema = z.object({
	productRatePlanIds: z.array(z.string()).transform((arr) => new Set(arr)),
	countries: z.array(isoCountrySchema).transform((arr) => new Set(arr)),
});

export const promotionSchema = z.object({
	name: z.string(),
	description: z.string(),
	promotionType: promotionTypeSchema,
	appliesTo: appliesToSchema,
	campaignCode: z.string(),
	codes: z.record(z.string(), z.array(z.string())),
	starts: z.coerce.date(),
	expires: z.coerce.date().optional(),
	landingPage: promotionCopySchema.optional(),
});
export type Promotion = z.infer<typeof promotionSchema>;

export const appliedPromotionSchema = z.object({
	promoCode: z.string(),
	countryGroupId: supportInternationalisationSchema,
});
export type AppliedPromotion = z.infer<typeof appliedPromotionSchema>;
