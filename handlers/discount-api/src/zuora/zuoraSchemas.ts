import { z } from 'zod';

export type OAuthClientCredentials = z.infer<
	typeof oAuthClientCredentialsSchema
>;
export const oAuthClientCredentialsSchema = z.object({
	clientId: z.string(),
	clientSecret: z.string(),
});

export type ZuoraBearerToken = z.infer<typeof zuoraBearerTokenSchema>;

export const zuoraBearerTokenSchema = z.object({
	access_token: z.string(),
	expires_in: z.number(),
});

export const zuoraSubscriptionSchema = z.object({
	success: z.boolean(),
	id: z.string(),
	accountNumber: z.string(),
	subscriptionNumber: z.string(),
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
					name: z.string(),
					type: z.string(),
					model: z.string(),
					currency: z.string(),
					effectiveStartDate: z.coerce.date(),
					effectiveEndDate: z.coerce.date(),
					processedThroughDate: z.coerce.date(),
					chargedThroughDate: z.coerce.date(),
					upToPeriodsType: z.nullable(z.string()),
					upToPeriods: z.nullable(z.number()),
					price: z.nullable(z.number()),
					discountPercentage: z.nullable(z.number()),
				}),
			),
		}),
	),
});

export type ZuoraSubscription = z.infer<typeof zuoraSubscriptionSchema>;

export type RatePlan = ZuoraSubscription['ratePlans'][number];

export type RatePlanCharge = RatePlan['ratePlanCharges'][number];
export const zuoraSubscribeResponseSchema = z.array(
	z.object({
		Success: z.boolean(),
		SubscriptionNumber: z.string(),
		AccountNumber: z.string(),
	}),
);

export type ZuoraSubscribeResponse = z.infer<
	typeof zuoraSubscribeResponseSchema
>;

export const zuoraSuccessResponseSchema = z.object({
	success: z.boolean(),
});

export type ZuoraSuccessResponse = z.infer<typeof zuoraSuccessResponseSchema>;

export const billingPreviewSchema = z.object({
	accountId: z.string(),
	invoiceItems: z.array(
		z.object({
			id: z.string(),
			subscriptionId: z.string(),
			subscriptionNumber: z.string(),
			serviceStartDate: z.coerce.date(),
			serviceEndDate: z.coerce.date(),
			chargeAmount: z.number(),
			chargeName: z.string(),
			chargeNumber: z.string(),
			chargeId: z.string(),
			productName: z.string(),
			quantity: z.number(),
			taxAmount: z.number(),
			chargeType: z.string(),
			processingType: z.string(),
		}),
	),
});

export type BillingPreview = z.infer<typeof billingPreviewSchema>;
export type InvoiceItem = BillingPreview['invoiceItems'][number];
