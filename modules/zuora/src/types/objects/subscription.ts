import { BillingPeriodValues } from '@modules/billingPeriod';
import {
	productIdSchema,
	productRatePlanChargeIdSchema,
	productRatePlanIdSchema,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import { z } from 'zod';

const billingPeriodAlignmentValues = [
	'AlignToCharge',
	'AlignToSubscriptionStart',
	'AlignToTermStart',
] as const;
export type BillingPeriodAlignment =
	(typeof billingPeriodAlignmentValues)[number];
export const zuoraSubscriptionSchema = z.object({
	id: z.string(),
	accountNumber: z.string(),
	subscriptionNumber: z.string(),
	status: z.enum(['Active', 'Cancelled']),
	contractEffectiveDate: z.coerce.date(),
	serviceActivationDate: z.coerce.date(),
	customerAcceptanceDate: z.coerce.date(),
	subscriptionStartDate: z.coerce.date(),
	subscriptionEndDate: z.coerce.date(),
	lastBookingDate: z.coerce.date(),
	termStartDate: z.coerce.date(),
	termEndDate: z.coerce.date(),
	ratePlans: z.array(
		z.object({
			id: z.string(),
			lastChangeType: z.optional(z.string()),
			productId: productIdSchema,
			productName: z.string(),
			productRatePlanId: productRatePlanIdSchema,
			ratePlanName: z.string(),
			ratePlanCharges: z.array(
				z.object({
					id: z.string(),
					productRatePlanChargeId: productRatePlanChargeIdSchema,
					number: z.string(),
					name: z.string(),
					type: z.string(),
					model: z.string(),
					currency: z.string(),
					effectiveStartDate: z.coerce.date(),
					effectiveEndDate: z.coerce.date(),
					billingPeriod: z.nullable(z.enum(BillingPeriodValues)),
					processedThroughDate: z.coerce.date(),
					chargedThroughDate: z.coerce.date().nullable(),
					upToPeriodsType: z.nullable(z.string()),
					upToPeriods: z.nullable(z.number()),
					price: z.nullable(z.number()),
					discountPercentage: z.nullable(z.number()),
					billingPeriodAlignment: z
						.enum(billingPeriodAlignmentValues)
						.nullable(),
				}),
			),
		}),
	),
});

export type ZuoraSubscription = z.infer<typeof zuoraSubscriptionSchema>;

export type RatePlan = ZuoraSubscription['ratePlans'][number];

export type RatePlanCharge = RatePlan['ratePlanCharges'][number];
