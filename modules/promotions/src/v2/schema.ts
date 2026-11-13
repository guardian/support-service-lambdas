import { z } from 'zod';
import type { CountryCode } from '@modules/internationalisation/country';
import { countryGroups } from '@modules/internationalisation/countryGroup';
import {
	countryCodeSchema,
	supportRegionSchema,
} from '@modules/internationalisation/schemas';
import { productAndRatePlanKeySchema } from '@modules/product-catalog/productCatalog';
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
	countries: z.array(countryCodeSchema),
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
	isIntroductoryPricing: optionalDropNulls(z.boolean()),
});

export type Promo = z.infer<typeof promoSchema>;

const promoCountryGroups = {
	ukm: ['GB'],
	ukos: countryGroups.GBPCountries.countries.filter(
		(country) => country !== 'GB',
	),
	us: countryGroups.UnitedStates.countries,
	ca: countryGroups.Canada.countries,
	au: countryGroups.AUDCountries.countries,
	nz: countryGroups.NZDCountries.countries,
	eu: countryGroups.EURCountries.countries,
	int: countryGroups.International.countries,
} satisfies Record<string, CountryCode[]>;
const promoCountryGroupSchema = z.custom<keyof typeof promoCountryGroups>(
	(id) => typeof id === 'string' && Object.hasOwn(promoCountryGroups, id),
);

export const promoItemSchema = promoSchema.extend({
	appliesTo: appliesToSchema
		.extend({
			countries: optionalDropNulls(z.array(countryCodeSchema)),
			countryGroups: optionalDropNulls(z.array(promoCountryGroupSchema)),
		})
		.refine(
			({ countries, countryGroups }) =>
				countries !== undefined || countryGroups !== undefined,
			{ message: 'A promotion must define countries or country groups' },
		)
		.transform(
			({ countries = [], countryGroups = [], productRatePlanIds }) => ({
				productRatePlanIds,
				countries: [
					...new Set([
						...countries,
						...countryGroups.flatMap((id) => promoCountryGroups[id]),
					]),
				],
			}),
		),
});

/**
 * The catalog rate plans a promotion applies to, resolved from the raw
 * `productRatePlanIds` stored in Dynamo so that promotions can be searched by
 * ProductKey and ProductRatePlanKey.
 */
export const promoWithCatalogInformationSchema = promoSchema.extend({
	appliesTo: appliesToSchema.extend({
		catalogRatePlans: z.array(productAndRatePlanKeySchema),
	}),
});

export type PromoWithCatalogInformation = z.infer<
	typeof promoWithCatalogInformationSchema
>;

export const appliedPromotionSchema = z.object({
	promoCode: z.string(),
	supportRegionId: supportRegionSchema,
	countryCode: countryCodeSchema.optional(),
});
export type AppliedPromotion = z.infer<typeof appliedPromotionSchema>;
