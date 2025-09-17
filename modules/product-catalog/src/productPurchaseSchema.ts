// ---------- This file is auto-generated. Do not edit manually. -------------

// This schema is used mostly in support-frontend to validate the
// product and rate plan passed in the support-workers state

import { z } from 'zod';
import type { ProductKey } from '@modules/product-catalog/productCatalog';

const deliveryContactSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	workEmail: z.string(),
	country: z.string(),
	state: z.string().nullish(),
	city: z.string(),
	address1: z.string(),
	address2: z.string().nullish(),
	postalCode: z.string(),
});

const dateOrDateStringSchema = z.preprocess(
	(input) => (typeof input === 'string' ? new Date(input) : input),
	z.date(),
);

export const productPurchaseSchema = z.discriminatedUnion('product', [
	z.object({
		product: z.literal('Contribution'),
		ratePlan: z.union([z.literal('Annual'), z.literal('Monthly')]),
		amount: z.number(),
	}),
	z.object({
		product: z.literal('DigitalSubscription'),
		ratePlan: z.union([
			z.literal('Annual'),
			z.literal('Monthly'),
			z.literal('Quarterly'),
			z.literal('OneYearGift'),
			z.literal('ThreeMonthGift'),
		]),
	}),
	z.object({
		product: z.literal('GuardianAdLite'),
		ratePlan: z.literal('Monthly'),
	}),
	z.object({
		product: z.literal('GuardianWeeklyDomestic'),
		ratePlan: z.union([
			z.literal('OneYearGift'),
			z.literal('ThreeMonthGift'),
			z.literal('Annual'),
			z.literal('Monthly'),
			z.literal('Quarterly'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('GuardianWeeklyRestOfWorld'),
		ratePlan: z.union([
			z.literal('OneYearGift'),
			z.literal('ThreeMonthGift'),
			z.literal('Annual'),
			z.literal('Monthly'),
			z.literal('Quarterly'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('GuardianWeeklyZoneA'),
		ratePlan: z.union([z.literal('Annual'), z.literal('Quarterly')]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('GuardianWeeklyZoneB'),
		ratePlan: z.union([z.literal('Annual'), z.literal('Quarterly')]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('GuardianWeeklyZoneC'),
		ratePlan: z.union([z.literal('Annual'), z.literal('Quarterly')]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('HomeDelivery'),
		ratePlan: z.union([
			z.literal('Everyday'),
			z.literal('EverydayPlus'),
			z.literal('Saturday'),
			z.literal('SaturdayPlus'),
			z.literal('Sixday'),
			z.literal('SixdayPlus'),
			z.literal('Sunday'),
			z.literal('SundayPlus'),
			z.literal('Weekend'),
			z.literal('WeekendPlus'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
		deliveryInstructions: z.string(),
	}),
	z.object({
		product: z.literal('NationalDelivery'),
		ratePlan: z.union([
			z.literal('Everyday'),
			z.literal('EverydayPlus'),
			z.literal('Sixday'),
			z.literal('SixdayPlus'),
			z.literal('Weekend'),
			z.literal('WeekendPlus'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
		deliveryInstructions: z.string(),
		deliveryAgent: z.number(),
	}),
	z.object({
		product: z.literal('NewspaperVoucher'),
		ratePlan: z.union([
			z.literal('Everyday'),
			z.literal('EverydayPlus'),
			z.literal('Saturday'),
			z.literal('SaturdayPlus'),
			z.literal('Sixday'),
			z.literal('SixdayPlus'),
			z.literal('Sunday'),
			z.literal('SundayPlus'),
			z.literal('Weekend'),
			z.literal('WeekendPlus'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('PartnerMembership'),
		ratePlan: z.union([
			z.literal('Annual'),
			z.literal('Monthly'),
			z.literal('V1DeprecatedAnnual'),
			z.literal('V1DeprecatedMonthly'),
		]),
	}),
	z.object({
		product: z.literal('PatronMembership'),
		ratePlan: z.union([
			z.literal('Annual'),
			z.literal('Monthly'),
			z.literal('V1DeprecatedAnnual'),
			z.literal('V1DeprecatedMonthly'),
		]),
	}),
	z.object({
		product: z.literal('SubscriptionCard'),
		ratePlan: z.union([
			z.literal('Everyday'),
			z.literal('EverydayPlus'),
			z.literal('Saturday'),
			z.literal('SaturdayPlus'),
			z.literal('Sixday'),
			z.literal('SixdayPlus'),
			z.literal('Sunday'),
			z.literal('SundayPlus'),
			z.literal('Weekend'),
			z.literal('WeekendPlus'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('SupporterMembership'),
		ratePlan: z.union([
			z.literal('V2DeprecatedAnnual'),
			z.literal('V2DeprecatedMonthly'),
			z.literal('V1DeprecatedAnnual'),
			z.literal('Annual'),
			z.literal('V1DeprecatedMonthly'),
			z.literal('Monthly'),
		]),
	}),
	z.object({
		product: z.literal('SupporterPlus'),
		ratePlan: z.union([
			z.literal('OneYearStudent'),
			z.literal('V1DeprecatedAnnual'),
			z.literal('V1DeprecatedMonthly'),
			z.literal('Annual'),
			z.literal('Monthly'),
		]),
		amount: z.number(),
	}),
	z.object({
		product: z.literal('TierThree'),
		ratePlan: z.union([
			z.literal('DomesticAnnual'),
			z.literal('DomesticMonthly'),
			z.literal('RestOfWorldAnnual'),
			z.literal('RestOfWorldMonthly'),
			z.literal('DomesticAnnualV2'),
			z.literal('DomesticMonthlyV2'),
			z.literal('RestOfWorldAnnualV2'),
			z.literal('RestOfWorldMonthlyV2'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
]);

export type ProductPurchase = z.infer<typeof productPurchaseSchema>;
// Generic type for a specific product
export type ProductPurchaseFor<P extends ProductKey> = Extract<
	ProductPurchase,
	{ product: P }
>;
