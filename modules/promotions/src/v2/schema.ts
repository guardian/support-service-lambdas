import { z } from 'zod';
import {
	isoCountrySchema,
	supportRegionSchema,
} from '@modules/internationalisation/schemas';
import type {
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { optionalDropNulls } from '@modules/schemaUtils';

export const promoCampaignSchema = z.object({
	campaignCode: z.string(),
	product: z.enum([
		'SupporterPlus',
		'TierThree',
		'DigitalSubscription',
		'Newspaper',
		'Weekly',
	]),
	name: z.string(),
	created: z.string(),
});

export type PromoCampaign = z.infer<typeof promoCampaignSchema>;

export const appliesToSchema = z.object({
	productRatePlanIds: z.array(z.string()),
	countries: z.array(isoCountrySchema),
});

export type AppliesTo = z.infer<typeof appliesToSchema>;

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

/**
 * A product catalog rate plan a promotion applies to, resolved from a raw
 * Zuora `productRatePlanId` stored in Dynamo.
 */
export type PromoCatalogInformation = {
	productKey: ProductKey;
	productRatePlanKey: ProductRatePlanKey<ProductKey>;
};

/**
 * The catalog rate plans a promotion applies to, resolved from the raw
 * `productRatePlanIds` stored in Dynamo so that promotions can be searched by
 * ProductKey and ProductRatePlanKey.
 */
export type AppliesToCatalogInformation = AppliesTo & {
	catalogRatePlans: PromoCatalogInformation[];
};

export type PromoWithCatalogInformation = Omit<Promo, 'appliesTo'> & {
	appliesTo: AppliesToCatalogInformation;
};

export const appliedPromotionSchema = z.object({
	promoCode: z.string(),
	supportRegionId: supportRegionSchema,
});
export type AppliedPromotion = z.infer<typeof appliedPromotionSchema>;
