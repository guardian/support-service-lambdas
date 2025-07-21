// ---------- This file is auto-generated. Do not edit manually. -------------

// This schema is used mostly in support-frontend to validate the
// product and rate plan passed in the support-workers state

import { z } from 'zod';

export const validProductAndRatePlanCombinationsSchema = z.discriminatedUnion(
	'product',
	[
		z.object({
			product: z.literal('Contribution'),
			ratePlan: z.union([z.literal('Annual'), z.literal('Monthly')]),
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
		}),
		z.object({
			product: z.literal('GuardianWeeklyZoneA'),
			ratePlan: z.union([z.literal('Annual'), z.literal('Quarterly')]),
		}),
		z.object({
			product: z.literal('GuardianWeeklyZoneB'),
			ratePlan: z.union([z.literal('Quarterly'), z.literal('Annual')]),
		}),
		z.object({
			product: z.literal('GuardianWeeklyZoneC'),
			ratePlan: z.union([z.literal('Quarterly'), z.literal('Annual')]),
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
	],
);
