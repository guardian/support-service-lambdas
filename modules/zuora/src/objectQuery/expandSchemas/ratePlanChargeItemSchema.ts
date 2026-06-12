import z from 'zod';

export const ratePlanChargeItemSchema = z.object({
	/** The unique identifier of the rate plan charge. */
	id: z.string(),
	/** The unique identifier of the user who created the rate plan charge. */
	createdById: z.string(),
	/** The date and time when the rate plan charge was created. */
	createdDate: z.coerce.date(),
	/** The unique identifier of the user who last updated the rate plan charge. */
	updatedById: z.string(),
	/** The date and time when the rate plan charge was last updated. */
	updatedDate: z.coerce.date(),
	/** The unique identifier of the rate plan to which this charge belongs. */
	ratePlanId: z.string(),
	/** The unique identifier of the product rate plan charge this is based on. */
	productRatePlanChargeId: z.string(),
	/** Specifies the type of charges a specific discount applies to. */
	applyDiscountTo: z
		.enum([
			'ONETIME',
			'RECURRING',
			'USAGE',
			'ONETIMERECURRING',
			'ONETIMEUSAGE',
			'RECURRINGUSAGE',
			'ONETIMERECURRINGUSAGE',
		])
		.nullable(),
	/** The charge's billing cycle day (BCD). */
	billCycleDay: z.number().int().nullable(),
	/** Specifies how to determine the billing day for the charge. */
	billCycleType: z.enum([
		'DefaultFromCustomer',
		'SpecificDayofMonth',
		'SubscriptionStartDay',
		'ChargeTriggerDay',
		'SpecificDayofWeek',
		'TermStartDay',
		'TermEndDay',
	]),
	/** Allows the billing period to be overridden on the rate plan charge. */
	billingPeriod: z.enum([
		'Month',
		'Quarter',
		'Annual',
		'Semi-Annual',
		'Specific Months',
		'Subscription Term',
		'Week',
		'Specific Weeks',
		'Specific Days',
	]),
	/** Aligns charges within the same subscription if multiple charges begin on different dates. */
	billingPeriodAlignment: z.enum([
		'AlignToCharge',
		'AlignToSubscriptionStart',
		'AlignToTermStart',
		'AlignToTermEnd',
	]),
	/**
	 * The date through which a customer has been billed for the charge.
	 * Null for charges that have not yet been billed.
	 */
	chargedThroughDate: z.coerce.date().nullable(),
	/** Determines how to evaluate charges. */
	chargeModel: z.enum([
		'Discount-Fixed Amount',
		'Discount-Percentage',
		'Flat Fee Pricing',
		'Per Unit Pricing',
		'Overage Pricing',
		'Tiered Pricing',
		'Tiered with Overage Pricing',
		'Volume Pricing',
		'Delivery Pricing',
		'MultiAttributePricing',
		'PreratedPerUnit',
		'PreratedPricing',
		'HighWatermarkVolumePricing',
		'HighWatermarkTieredPricing',
	]),
	/** A unique number that identifies the charge. */
	chargeNumber: z.string(),
	/** Specifies the type of charge. */
	chargeType: z.enum(['OneTime', 'Recurring', 'Usage']),
	/** A description of the rate plan charge. */
	description: z.string().nullable(),
	/** Delta monthly recurring charge — the change in MRR caused by an amendment or new subscription. */
	dMRC: z.number(),
	/** After an amendment, the change in total contract value (TCV) for this charge. */
	dTCV: z.number(),
	/** The final date the rate plan charge is active, as yyyy-mm-dd. */
	effectiveEndDate: z.coerce.date(),
	/** The start date when the rate plan charge becomes active, as yyyy-mm-dd. */
	effectiveStartDate: z.coerce.date(),
	/** Condition for the charge to become inactive. */
	endDateCondition: z.enum([
		'SubscriptionEnd',
		'FixedPeriod',
		'SpecificEndDate',
		'OneTime',
	]),
	/** Indicates if this segment of the rate plan charge is the most recent. */
	isLastSegment: z.boolean(),
	/** Indicates whether the rate plan charge has been processed. */
	isProcessed: z.boolean(),
	/** The list price base for the product rate plan charge. */
	listPriceBase: z.enum([
		'Per Billing Period',
		'Per Month',
		'Per Week',
		'Per Year',
		'Per Specific Months',
	]),
	/** Monthly recurring revenue (MRR) for this charge. */
	mRR: z.number(),
	/** The name of the rate plan charge. */
	name: z.string(),
	/** Number of periods used when calculating overage smoothing charge model charges. */
	numberOfPeriods: z.number().int().nullable(),
	/** The original ID of the rate plan charge. */
	originalId: z.string(),
	/** Determines when to calculate overage charges. */
	overageCalculationOption: z
		.enum(['EndOfSmoothingPeriod', 'PerBillingPeriod'])
		.nullable(),
	/** Determines whether to credit the customer with unused units of usage. */
	overageUnusedUnitsCreditOption: z
		.enum(['NoCredit', 'CreditBySpecificRate'])
		.nullable(),
	/** Applies an automatic price change when a termed subscription is renewed. */
	priceChangeOption: z
		.enum([
			'NoChange',
			'SpecificPercentageValue',
			'UseLatestProductCatalogPricing',
		])
		.nullable(),
	/** The percentage to increase or decrease the price of renewed subscriptions. */
	priceIncreasePercentage: z.number(),
	/** The percentage used by percentage-based discount charges. */
	percentage: z.number().nullable(),
	/**
	 * The date until when charges have been processed.
	 * Null for charges that have not yet been processed.
	 */
	processedThroughDate: z.coerce.date().nullable(),
	/** Specifies when revenue recognition begins. */
	revRecTriggerCondition: z
		.enum([
			'ContractEffectiveDate',
			'ServiceActivationDate',
			'CustomerAcceptanceDate',
		])
		.nullable(),
	/** The identifying segment number of the rate plan charge, starting at 1. */
	segment: z.number().int(),
	/** Customises the number of months or weeks for the charge's billing period. */
	specificBillingPeriod: z.number().int().nullable(),
	/**
	 * The specific date on which the charge ends, in yyyy-mm-dd format.
	 * Only applicable when endDateCondition is SpecificEndDate; null otherwise.
	 */
	specificEndDate: z.coerce.date().nullable(),
	/** The total contract value (TCV) of this rate plan charge over the subscription lifetime. */
	tCV: z.number(),
	/**
	 * The date when the charge becomes effective and billing begins.
	 * Only required when triggerEvent is SpecificDate; null otherwise.
	 */
	triggerDate: z.coerce.date().nullable(),
	/** Specifies when to start billing the customer for the charge. */
	triggerEvent: z.enum([
		'ContractEffective',
		'ServiceActivation',
		'CustomerAcceptance',
		'SpecificDate',
	]),
	/** Specifies the length of the period during which the charge is active. */
	upToPeriods: z.number().int().nullable(),
	/** The period type used to define when the charge ends. */
	upToPeriodsType: z.enum([
		'Billing Periods',
		'Days',
		'Weeks',
		'Months',
		'Years',
	]),
	/** The version of the rate plan charge; incremented each time the charge is amended. */
	version: z.number().int(),
	/** The unique identifier of the subscription to which the rate plan charge belongs. */
	subscriptionId: z.string(),
	/** ID of the account that owns the subscription. */
	subscriptionOwnerId: z.string(),
	/** ID of the account that will pay the billing documents for the subscription. */
	invoiceOwnerId: z.string(),
	/** The date when the rate plan charge was created through an order or amendment. */
	originalOrderDate: z.coerce.date(),
	/** The date when the rate plan charge was last amended through an order or amendment. */
	amendedByOrderOn: z.coerce.date(),
	/** Whether the rate plan charge is taxable. */
	taxable: z.boolean(),
	/** Indicates whether the rate plan charge has been reverted. */
	reverted: z.boolean(),
	/** Indicates whether the discount is reflected in the net amount. */
	reflectDiscountInNetAmount: z.boolean(),
	/** Indicates whether price upsell quantity is stacked. */
	priceUpsellQuantityStacked: z.boolean(),
	/** Indicates whether the rate plan charge is committed. */
	isCommitted: z.boolean(),
});
