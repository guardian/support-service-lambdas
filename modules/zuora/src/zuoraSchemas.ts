import { BillingPeriodValues } from '@modules/billingPeriod';
import { z } from 'zod';
import { zuoraResponseSchema } from './types';

// --------------- Auth ---------------
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

// --------------- Subscribe ---------------
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

// --------------- Invoice Items ---------------
export const getInvoiceSchema = z.object({
	success: z.boolean(),
	id: z.string(),
	amount: z.number(),
	amountWithoutTax: z.number(),
	balance: z.number(),
});

export type GetInvoiceResponse = z.infer<typeof getInvoiceSchema>;

export const getInvoiceItemsSchema = z.object({
	success: z.boolean(),
	invoiceItems: z.array(
		z.object({
			id: z.string(),
			productRatePlanChargeId: z.string(),
			availableToCreditAmount: z.number(),
			taxationItems: z.object({
				data: z.array(
					z.object({
						id: z.string(),
						availableToCreditAmount: z.number(),
					}),
				),
			}),
		}),
	),
});

export type GetInvoiceItemsResponse = z.infer<typeof getInvoiceItemsSchema>;

export const invoiceItemSchema = z.object({
	id: z.optional(z.string()),
	subscriptionNumber: z.string(),
	serviceStartDate: z.coerce.date(),
	serviceEndDate: z.coerce.date(),
	chargeAmount: z.number(),
	chargeName: z.string(),
	taxAmount: z.number(),
});
// --------------- Billing preview ---------------
export const billingPreviewInvoiceItemSchema = z.object({
	id: z.optional(z.string()),
	subscriptionNumber: z.string(),
	serviceStartDate: z.coerce.date(),
	chargeName: z.string(),
	chargeAmount: z.number(),
	taxAmount: z.number(),
});

export const billingPreviewSchema = z.object({
	accountId: z.string(),
	invoiceItems: z.array(billingPreviewInvoiceItemSchema),
});

export type BillingPreview = z.infer<typeof billingPreviewSchema>;
export type BillingPreviewInvoiceItem = z.infer<
	typeof billingPreviewInvoiceItemSchema
>;

// --------------- Add discount preview ---------------
export const addDiscountPreviewSchema = z.object({
	success: z.boolean(),
	invoiceItems: z.array(
		// This looks the same as the invoice items object in billingPreviewSchema, but the call returns
		// fewer fields, so I'm defining it separately in case someone wants to add the missing fields to
		// the other object later.
		z.object({
			id: z.optional(z.string()),
			serviceStartDate: z.coerce.date(),
			serviceEndDate: z.coerce.date(),
			chargeAmount: z.number(),
			chargeName: z.string(),
			taxAmount: z.number(),
		}),
	),
});

export type AddDiscountPreview = z.infer<typeof addDiscountPreviewSchema>;

// --------------- Invoice Item Adjustment ---------------
export const invoiceItemAdjustmentResultSchema = z.object({
	Success: z.boolean(),
	Id: z.string().optional(),
});

export type InvoiceItemAdjustmentType = 'Credit' | 'Charge';

export type InvoiceItemAdjustmentSourceType = 'InvoiceDetail' | 'Tax';

export type InvoiceItemAdjustmentResult = z.infer<
	typeof invoiceItemAdjustmentResultSchema
>;
