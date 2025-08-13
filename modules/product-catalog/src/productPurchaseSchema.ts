// ---------- This file is auto-generated. Do not edit manually. -------------

// This schema is used mostly in support-frontend to validate the
// product and rate plan passed in the support-workers state

import { z } from 'zod';

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
		product: z.literal('GuardianWeeklyRestOfWorld'),
		ratePlan: z.union([
			z.literal('Monthly'),
			z.literal('OneYearGift'),
			z.literal('Annual'),
			z.literal('Quarterly'),
			z.literal('ThreeMonthGift'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('GuardianAdLite'),
		ratePlan: z.literal('Monthly'),
	}),
	z.object({
		product: z.literal('TierThree'),
		ratePlan: z.union([
			z.literal('RestOfWorldAnnualV2'),
			z.literal('RestOfWorldMonthlyV2'),
			z.literal('DomesticAnnualV2'),
			z.literal('DomesticMonthlyV2'),
			z.literal('RestOfWorldMonthly'),
			z.literal('RestOfWorldAnnual'),
			z.literal('DomesticAnnual'),
			z.literal('DomesticMonthly'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('DigitalSubscription'),
		ratePlan: z.union([
			z.literal('Monthly'),
			z.literal('Annual'),
			z.literal('Quarterly'),
			z.literal('ThreeMonthGift'),
			z.literal('OneYearGift'),
		]),
	}),
	z.object({
		product: z.literal('NationalDelivery'),
		ratePlan: z.union([
			z.literal('EverydayPlus'),
			z.literal('Everyday'),
			z.literal('SixdayPlus'),
			z.literal('WeekendPlus'),
			z.literal('Sixday'),
			z.literal('Weekend'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
		deliveryInstructions: z.string(),
		deliveryAgent: z.number(),
	}),
	z.object({
		product: z.literal('SupporterMembership'),
		ratePlan: z.union([
			z.literal('Annual'),
			z.literal('Monthly'),
			z.literal('V2DeprecatedAnnual'),
			z.literal('V1DeprecatedAnnual'),
			z.literal('V1DeprecatedMonthly'),
			z.literal('V2DeprecatedMonthly'),
		]),
	}),
	z.object({
		product: z.literal('SupporterPlus'),
		ratePlan: z.union([
			z.literal('OneYearStudent'),
			z.literal('V1DeprecatedMonthly'),
			z.literal('V1DeprecatedAnnual'),
			z.literal('Monthly'),
			z.literal('Annual'),
		]),
		amount: z.number(),
	}),
	z.object({
		product: z.literal('GuardianWeeklyDomestic'),
		ratePlan: z.union([
			z.literal('OneYearGift'),
			z.literal('Annual'),
			z.literal('Quarterly'),
			z.literal('Monthly'),
			z.literal('ThreeMonthGift'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('SubscriptionCard'),
		ratePlan: z.union([
			z.literal('EverydayPlus'),
			z.literal('SixdayPlus'),
			z.literal('SundayPlus'),
			z.literal('SaturdayPlus'),
			z.literal('WeekendPlus'),
			z.literal('Weekend'),
			z.literal('Sixday'),
			z.literal('Everyday'),
			z.literal('Sunday'),
			z.literal('Saturday'),
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
		ratePlan: z.union([z.literal('Quarterly'), z.literal('Annual')]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('GuardianWeeklyZoneC'),
		ratePlan: z.union([z.literal('Quarterly'), z.literal('Annual')]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('NewspaperVoucher'),
		ratePlan: z.union([
			z.literal('EverydayPlus'),
			z.literal('WeekendPlus'),
			z.literal('SixdayPlus'),
			z.literal('SundayPlus'),
			z.literal('SaturdayPlus'),
			z.literal('Everyday'),
			z.literal('Weekend'),
			z.literal('Sunday'),
			z.literal('Sixday'),
			z.literal('Saturday'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
	}),
	z.object({
		product: z.literal('HomeDelivery'),
		ratePlan: z.union([
			z.literal('SixdayPlus'),
			z.literal('EverydayPlus'),
			z.literal('SaturdayPlus'),
			z.literal('WeekendPlus'),
			z.literal('SundayPlus'),
			z.literal('Sixday'),
			z.literal('Weekend'),
			z.literal('Everyday'),
			z.literal('Sunday'),
			z.literal('Saturday'),
		]),
		firstDeliveryDate: dateOrDateStringSchema,
		deliveryContact: deliveryContactSchema,
		deliveryInstructions: z.string(),
	}),
	z.object({
		product: z.literal('PatronMembership'),
		ratePlan: z.union([
			z.literal('Monthly'),
			z.literal('Annual'),
			z.literal('V1DeprecatedAnnual'),
			z.literal('V1DeprecatedMonthly'),
		]),
	}),
	z.object({
		product: z.literal('PartnerMembership'),
		ratePlan: z.union([
			z.literal('V1DeprecatedAnnual'),
			z.literal('Monthly'),
			z.literal('Annual'),
			z.literal('V1DeprecatedMonthly'),
		]),
	}),
]);

export type ProductPurchase = z.infer<typeof productPurchaseSchema>;
