import { BillingPeriodValues } from '@modules/billingPeriod';
import { z } from 'zod';
import { zuoraResponseSchema } from './types';

// --------------- Subscription ---------------
export const zuoraSubscriptionSchema = z.object({
	id: z.string(),
	accountNumber: z.string(),
	subscriptionNumber: z.string(),
	status: z.string(),
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
			productId: z.string(),
			productName: z.string(),
			productRatePlanId: z.string(),
			ratePlanName: z.string(),
			ratePlanCharges: z.array(
				z.object({
					id: z.string(),
					productRatePlanChargeId: z.string(),
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
				}),
			),
		}),
	),
});
export const zuoraSubscriptionResponseSchema = z
	.object({
		success: z.boolean(),
	})
	.merge(zuoraSubscriptionSchema);

export type ZuoraSubscription = z.infer<typeof zuoraSubscriptionSchema>;

export type RatePlan = ZuoraSubscription['ratePlans'][number];

export type RatePlanCharge = RatePlan['ratePlanCharges'][number];

// --------------- Account ---------------
export const zuoraAccountBasicInfoSchema = z
	.object({
		id: z.string(),
		IdentityId__c: z.string(),
	})
	.transform((obj) => ({
		id: obj.id,
		identityId: obj.IdentityId__c,
	}));

export const metricsSchema = z.object({
	totalInvoiceBalance: z.number(),
	currency: z.string(),
});
export const billToContactSchema = z.object({
	firstName: z.string(),
	lastName: z.string(),
	workEmail: z.string(),
});

export const billingAndPaymentSchema = z.object({
	currency: z.string(),
	defaultPaymentMethodId: z.string(),
});

export const zuoraAccountSchema = z.object({
	success: z.boolean(),
	basicInfo: zuoraAccountBasicInfoSchema,
	billingAndPayment: billingAndPaymentSchema,
	billToContact: billToContactSchema,
	metrics: metricsSchema,
});

export type ZuoraAccount = z.infer<typeof zuoraAccountSchema>;

export const zuoraSubscriptionsFromAccountSchema = zuoraResponseSchema.extend({
	subscriptions: z.array(zuoraSubscriptionSchema).optional(),
});

export type ZuoraSubscriptionsFromAccountResponse = z.infer<
	typeof zuoraSubscriptionsFromAccountSchema
>;

// --------------- Basic success response ---------------
export const zuoraSuccessResponseSchema = z.object({
	success: z.boolean(),
	reasons: z.optional(
		z.array(z.object({ code: z.number(), message: z.string() })),
	),
});

export const zuoraUpperCaseSuccessResponseSchema = z.object({
	Success: z.boolean(), //to do add reasons in case of failure
});

export type ZuoraSuccessResponse = z.infer<typeof zuoraSuccessResponseSchema>;

export type ZuoraUpperCaseSuccessResponse = z.infer<
	typeof zuoraUpperCaseSuccessResponseSchema
>;
