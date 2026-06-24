import z from 'zod';
import {
	ratePlanItemSchema,
	ratePlanWithChargesSchema,
} from '@modules/zuora/objectQuery/expandSchemas/ratePlanItemSchema';

/**
 * https://developer.zuora.com/v1-api-reference/api/object-queries/querysubscriptionbykey
 */
export const subscriptionItemSchema = z.object({
	/** The unique identifier of the subscription. */
	id: z.string(),
	/** The unique identifier of the user who created the subscription. */
	createdById: z.string(),
	/** The date and time when the subscription was created in Zuora. */
	createdDate: z.coerce.date(),
	/** The unique identifier of the user who last updated the subscription. */
	updatedById: z.string(),
	/** The date and time when the subscription was last updated. */
	updatedDate: z.coerce.date(),
	/** The ID of the account associated with this subscription. */
	accountId: z.string(),
	/** Whether the subscription automatically renews at the end of the term. */
	autoRenew: z.boolean(),
	/** The date on which the subscription was cancelled. */
	cancelledDate: z.coerce.date(),
	/** The date when the customer accepts the contract, in yyyy-mm-dd format. */
	contractAcceptanceDate: z.coerce.date(),
	/** The date when the subscription is activated, in yyyy-mm-dd format. */
	contractEffectiveDate: z.coerce.date(),
	/** The ID of the account that created the subscription. */
	creatorAccountId: z.string(),
	/** The account ID that owns the invoices associated with the created subscription. */
	creatorInvoiceOwnerId: z.string(),
	/** The length of the period for the current subscription term. */
	currentTerm: z.number().int(),
	/** The period type for the current subscription term. */
	currentTermPeriodType: z.enum(['Month', 'Year', 'Day', 'Week']),
	/** The length of the period for the initial subscription term. */
	initialTerm: z.number().int(),
	/** The period type for the first subscription term. */
	initialTermPeriodType: z.enum(['Month', 'Year', 'Day', 'Week']),
	/** The account ID that owns the invoices associated with the subscription. */
	invoiceOwnerId: z.string(),
	/** Whether the subscription is invoiced separately. */
	isInvoiceSeparate: z.boolean(),
	/** The name of the subscription. */
	name: z.string(),
	/** Additional information about the subscription. */
	notes: z.string().nullable(),
	/** The date when the subscription was originally created (same as createdDate until amended). */
	originalCreatedDate: z.coerce.date(),
	/** The original rate plan charge ID; only available for update subscription. */
	originalId: z.string(),
	/** The ID of the previous subscription; only available if this is a renewal subscription. */
	previousSubscriptionId: z.string().nullable(),
	/** Specifies whether a termed subscription will remain TERMED or change to EVERGREEN on renewal. */
	renewalSetting: z.enum(['RENEW_WITH_SPECIFIC_TERM', 'RENEW_TO_EVERGREEN']),
	/** The length of the period for the subscription renewal term. */
	renewalTerm: z.number().int(),
	/** The period type for the subscription renewal term. */
	renewalTermPeriodType: z.enum(['Month', 'Year', 'Day', 'Week']),
	/** An auto-generated decimal value uniquely tagging this subscription version (e.g. 1.0). */
	revision: z.string(),
	/** The date on which the services within the subscription have been activated. */
	serviceActivationDate: z.coerce.date(),
	/** Subscription status. */
	status: z.enum([
		'Draft',
		'Pending Activation',
		'Pending Acceptance',
		'Active',
		'Cancelled',
		'Suspended',
		'Expired',
	]),
	/** Whether the current subscription object is the latest version. */
	isLatestVersion: z.boolean(),
	/** The date when the subscription term ends. */
	subscriptionEndDate: z.coerce.date(),
	/** The date the subscription becomes effective. */
	subscriptionStartDate: z.coerce.date(),
	/** The ID of the amendment made to this subscription version. */
	subscriptionVersionAmendmentId: z.string().nullable(),
	/**
	 * The date the subscription term ends.
	 * would only be Null if the subscription is evergreen and no cancellation date has been set.
	 */
	termEndDate: z.coerce.date(),
	/** The date the subscription term begins. */
	termStartDate: z.coerce.date(),
	/** The type of the subscription term. */
	termType: z.enum(['TERMED', 'EVERGREEN']),
	/** The subscription version, incremented by each order or amendment. */
	version: z.number().int(),
	/** Monthly recurring revenue of the subscription. */
	cMRR: z.number(),
	/**
	 * The reason for a subscription cancellation.
	 * Null unless cancelled through the Orders UI or API.
	 */
	cancelReason: z.string().nullable(),
	/** The last booking date of the subscription object. */
	lastBookingDate: z.coerce.date(),

	/** The currency of the subscription. */
	currency: z.string(),

	/** The ID of the order associated with the subscription. */
	orderId: z.string().nullable(),
});

export const subscriptionWithRatePlansSchema = subscriptionItemSchema.extend({
	ratePlans: z.array(ratePlanItemSchema),
});

export type MmaZuoraSubscription = z.infer<
	typeof subscriptionWithRatePlansSchema
>;
export type MmaZuoraRatePlan = MmaZuoraSubscription['ratePlans'][number];

export const subscriptionWithRatePlanChargesSchema =
	subscriptionItemSchema.extend({
		ratePlans: z.array(ratePlanWithChargesSchema),
	});
