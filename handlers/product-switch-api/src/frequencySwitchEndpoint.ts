import { assertValidState } from '@modules/eligibility/eligibilityChecker';
import { validationRequirements as sharedValidationRequirements } from '@modules/eligibility/eligibilityChecker';
import { ValidationError } from '@modules/errors';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import { singleTriggerDate } from '@modules/zuora/orders/orderActions';
import type { OrderAction } from '@modules/zuora/orders/orderActions';
import {
	executeOrderRequest,
	previewOrderRequest,
} from '@modules/zuora/orders/orderRequests';
import type {
	CreateOrderRequest,
	PreviewOrderRequest,
} from '@modules/zuora/orders/orderRequests';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount } from '@modules/zuora/types';
import type {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/types/objects/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import type {
	FrequencySwitchPreviewResponse,
	FrequencySwitchRequestBody,
	FrequencySwitchResponse,
} from './frequencySwitchSchemas';
import { frequencySwitchErrorResponseSchema } from './frequencySwitchSchemas';
import type { ZuoraPreviewResponse, ZuoraSwitchResponse } from './schemas';
import {
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from './schemas';

/**
 * Validation requirements for frequency switch eligibility.
 * Extends the shared validation requirements with frequency-specific checks.
 */
export const frequencySwitchValidationRequirements = {
	// Reuse shared validation requirements for consistency
	...sharedValidationRequirements,
	// Frequency-specific validation requirements
	hasEligibleCharges:
		'subscription has at least one active recurring charge eligible for frequency switch',
	singleEligibleCharge:
		'subscription has exactly one eligible charge (multiple charges cannot be safely switched)',
	chargeHasValidPrice: 'eligible charge has a defined price',
	zeroContributionAmount:
		'contribution amount is zero (non-zero contributions cannot be preserved during frequency switch)',
};

/**
 * Select the SupporterPlus Monthly rate plan and its subscription charge eligible for a frequency switch.
 * Uses the product catalog to find the exact rate plan to switch to, validating both the rate plan
 * and its charges as a unit. This approach is more deterministic than filtering all charges.
 *
 * Validates that the subscription is eligible:
 * - Must be Active status
 * - Must not have outstanding unpaid invoices (totalInvoiceBalance must be 0)
 * - Must have a SupporterPlus Monthly rate plan that is active
 * - The rate plan must have a valid Subscription charge with valid dates and billing period
 *
 * @param subscription The subscription to validate
 * @param today Today's date for filtering active charges
 * @param account Optional account data for additional validations
 * @param productCatalog The product catalog for looking up the target rate plan
 * @returns The selected rate plan and charge eligible for frequency switch
 * @throws ValidationError if subscription fails any validation checks
 */
export function selectCandidateSubscriptionCharge(
	subscription: ZuoraSubscription,
	today: Date,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
): { ratePlan: RatePlan; charge: RatePlanCharge } {
	assertValidState(
		subscription.status === 'Active',
		frequencySwitchValidationRequirements.isActive,
		subscription.status,
	);

	assertValidState(
		account.metrics.totalInvoiceBalance === 0,
		frequencySwitchValidationRequirements.zeroAccountBalance,
		`${account.metrics.totalInvoiceBalance} ${account.metrics.currency}`,
	);

	// Find the SupporterPlus Monthly rate plan using the catalog
	const supporterPlusMonthlyRatePlanId =
		productCatalog.SupporterPlus.ratePlans.Monthly.id;

	const supporterPlusMonthlyRatePlan = subscription.ratePlans.find(
		(ratePlan) =>
			ratePlan.lastChangeType !== 'Remove' &&
			supporterPlusMonthlyRatePlanId === ratePlan.productRatePlanId,
	);

	assertValidState(
		supporterPlusMonthlyRatePlan !== undefined,
		frequencySwitchValidationRequirements.hasEligibleCharges,
		'SupporterPlus Monthly rate plan not found',
	);

	// Find the subscription charge using the catalog's product rate plan charge ID
	const subscriptionChargeId =
		productCatalog.SupporterPlus.ratePlans.Monthly.charges.Subscription.id;

	const subscriptionCharge = supporterPlusMonthlyRatePlan.ratePlanCharges.find(
		(charge) => charge.productRatePlanChargeId === subscriptionChargeId,
	);

	assertValidState(
		subscriptionCharge !== undefined,
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`Subscription charge not found in SupporterPlus Monthly rate plan`,
	);

	// Validate the charge properties
	assertValidState(
		subscriptionCharge.type === 'Recurring',
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`charge type is "${subscriptionCharge.type}", not "Recurring"`,
	);

	assertValidState(
		subscriptionCharge.effectiveStartDate < today,
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`effectiveStartDate ${subscriptionCharge.effectiveStartDate.toISOString()} is in the future`,
	);

	assertValidState(
		subscriptionCharge.effectiveEndDate >= today,
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`effectiveEndDate ${subscriptionCharge.effectiveEndDate.toISOString()} is in the past`,
	);

	assertValidState(
		!subscriptionCharge.chargedThroughDate ||
			subscriptionCharge.chargedThroughDate >= today,
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`chargedThroughDate ${subscriptionCharge.chargedThroughDate?.toISOString()} is in the past`,
	);

	assertValidState(
		subscriptionCharge.billingPeriod === 'Month' ||
			subscriptionCharge.billingPeriod === 'Annual',
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`billingPeriod is "${subscriptionCharge.billingPeriod}", not "Month" or "Annual"`,
	);

	assertValidState(
		subscriptionCharge.price !== null,
		frequencySwitchValidationRequirements.chargeHasValidPrice,
		`price is ${subscriptionCharge.price}`,
	);

	// Contribution amounts cannot be preserved during frequency switches because
	// the ChangePlan order action does not include chargeOverrides to maintain the contribution.
	// If we allowed this, customers who have updated their amount would lose their contribution.
	const contributionChargeId =
		productCatalog.SupporterPlus.ratePlans.Monthly.charges.Contribution.id;
	const contributionCharges =
		supporterPlusMonthlyRatePlan.ratePlanCharges.filter(
			(c) => c.productRatePlanChargeId === contributionChargeId,
		);

	assertValidState(
		contributionCharges.length === 1,
		'Expected exactly one Contribution charge in the rate plan',
		`Found ${contributionCharges.length} charges`,
	);

	const contributionCharge = contributionCharges[0]!;
	assertValidState(
		contributionCharge.price !== null,
		'Contribution charge price should be defined',
		`Found null price`,
	);

	assertValidState(
		contributionCharge.price === 0,
		frequencySwitchValidationRequirements.zeroContributionAmount,
		`contribution amount is ${contributionCharge.price}`,
	);

	return {
		ratePlan: supporterPlusMonthlyRatePlan,
		charge: subscriptionCharge,
	};
}

/**
 * Common information needed for both preview and execute frequency switches.
 */
interface FrequencySwitchInfo {
	targetRatePlanId: string;
	targetPrice: number;
	currency: IsoCurrency;
	effectiveDate: dayjs.Dayjs;
	orderActions: OrderAction[];
	currentRatePlan: RatePlan;
	currentCharge: RatePlanCharge;
}

/**
 * Prepare common information for a frequency switch.
 * Gets target rate plan, price, effective date, and builds order actions including
 * term renewal (if needed), discount removal, and plan change.
 *
 * @param currentRatePlan The current rate plan from the subscription
 * @param currentCharge The current charge eligible for switching
 * @param subscription The subscription being switched
 * @param productCatalog Product catalog for looking up rate plans and pricing
 * @param effectiveDate The date when the switch should take effect
 * @param today Today's date for filtering active discounts
 * @returns Common information needed for preview or execute
 */
function prepareFrequencySwitchInfo(
	currentRatePlan: RatePlan,
	currentCharge: RatePlanCharge,
	subscription: ZuoraSubscription,
	productCatalog: ProductCatalog,
	effectiveDate: dayjs.Dayjs,
	today: dayjs.Dayjs,
): FrequencySwitchInfo {
	const targetRatePlanId = getTargetRatePlanId(productCatalog, currentRatePlan);

	// Frequency switches are Supporter Plus specific, so directly access the Annual rate plan
	const currency: IsoCurrency = currentCharge.currency as IsoCurrency;
	const targetPrice =
		productCatalog.SupporterPlus.ratePlans.Annual.pricing[currency];

	const triggerDates = singleTriggerDate(effectiveDate);

	// Check if we need term renewal to avoid "cancellation date cannot be later than term end date" error
	// We need to perform term renewal if the chargedThroughDate (which will be used as the effective date)
	// extends beyond the current subscription term end date.
	const termEndDate = dayjs(subscription.termEndDate);
	const needsTermRenewal = effectiveDate.isAfter(termEndDate);

	// Find active discount rate plans that need to be removed
	// Discounts must be removed at the switch time to ensure customer ends up on full price
	const activeDiscountRatePlans = subscription.ratePlans.filter(
		(rp) =>
			rp.productName === 'Discounts' &&
			rp.lastChangeType !== 'Remove' &&
			rp.ratePlanCharges.some(
				(charge) =>
					charge.effectiveStartDate <= today.toDate() &&
					charge.effectiveEndDate >= today.toDate(),
			),
	);

	const orderActions: OrderAction[] = [];

	if (needsTermRenewal) {
		logger.log(
			`Adding term renewal because effectiveDate ${effectiveDate.format('YYYY-MM-DD')} is after termEndDate ${termEndDate.format('YYYY-MM-DD')}`,
		);
		orderActions.push({
			type: 'RenewSubscription',
			triggerDates,
		});
	}

	// Remove discount rate plans before changing the billing frequency
	// This ensures discounts don't carry over to the new billing period
	for (const discountRatePlan of activeDiscountRatePlans) {
		logger.log(
			`Removing discount rate plan ${discountRatePlan.ratePlanName} (${discountRatePlan.id})`,
		);
		orderActions.push({
			type: 'RemoveProduct',
			triggerDates,
			removeProduct: {
				ratePlanId: discountRatePlan.id,
			},
		});
	}

	orderActions.push({
		type: 'ChangePlan',
		triggerDates,
		changePlan: {
			productRatePlanId: currentRatePlan.productRatePlanId,
			subType: 'Upgrade',
			newProductRatePlan: {
				productRatePlanId: targetRatePlanId,
			},
		},
	});

	return {
		targetRatePlanId,
		targetPrice,
		currency,
		effectiveDate,
		orderActions,
		currentRatePlan,
		currentCharge,
	};
}

/**
 * Preview a frequency switch for a subscription.
 * Prepares the switch info and runs a preview order request to calculate savings and new price.
 */
export async function previewFrequencySwitch(
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	candidateCharge: { ratePlan: RatePlan; charge: RatePlanCharge },
	productCatalog: ProductCatalog,
	today: dayjs.Dayjs,
): Promise<FrequencySwitchPreviewResponse> {
	const { ratePlan, charge } = candidateCharge;
	logger.log('Previewing frequency switch (Orders API) from Monthly to Annual');

	try {
		// Preview with today's date as effective date
		const effectiveDate = today;

		const switchInfo = prepareFrequencySwitchInfo(
			ratePlan,
			charge,
			subscription,
			productCatalog,
			effectiveDate,
			today,
		);

		// Preview with today's date to get Zuora to generate invoices
		// Then filter to show only the new billing period charges (exclude credits/prorations)
		const orderRequest: PreviewOrderRequest = {
			previewOptions: {
				previewThruType: 'SpecificDate',
				previewTypes: ['BillingDocs'],
				specificPreviewThruDate: zuoraDateFormat(
					switchInfo.effectiveDate.add(1, 'month'),
				),
			},
			orderDate: zuoraDateFormat(switchInfo.effectiveDate),
			existingAccountNumber: subscription.accountNumber,
			subscriptions: [
				{
					subscriptionNumber: subscription.subscriptionNumber,
					orderActions: switchInfo.orderActions,
				},
			],
		};

		const zuoraPreview: ZuoraPreviewResponse = await previewOrderRequest(
			zuoraClient,
			orderRequest,
			zuoraPreviewResponseSchema,
		);

		logger.log('Orders preview returned successful response', zuoraPreview);

		// Extract the invoice from the preview response
		const invoice = getIfDefined(
			zuoraPreview.previewResult?.invoices[0],
			'No invoice found in the preview response',
		);

		// Calculate savings and new price for monthly to annual switch
		// currentCharge.price is guaranteed to be non-null by selectCandidateSubscriptionCharge validation
		const currentPrice = switchInfo.currentCharge.price as number;
		const currentAnnualCost = currentPrice * 12;
		const targetAnnualCost = switchInfo.targetPrice;
		const savingsAmount = currentAnnualCost - targetAnnualCost;
		const savingsPeriod = 'year' as const;
		const newPricePeriod = 'year' as const;

		// Calculate current contribution using catalog ID to identify the charge
		const contributionChargeId =
			productCatalog.SupporterPlus.ratePlans.Monthly.charges.Contribution.id;
		const contributionCharges =
			switchInfo.currentRatePlan.ratePlanCharges.filter(
				(c) => c.productRatePlanChargeId === contributionChargeId,
			);

		assertValidState(
			contributionCharges.length === 1,
			'Expected exactly one Contribution charge in the rate plan',
			`Found ${contributionCharges.length} charges`,
		);

		const contributionCharge = contributionCharges[0]!;
		assertValidState(
			contributionCharge.price !== null,
			'Contribution charge price should be a number (0 or positive amount)',
			`Found null price`,
		);

		const currentContributionAmount = contributionCharge.price;

		// Use Zuora's billing preview to calculate the discount amount accurately
		// This avoids replicating Zuora's complex logic for credits, discounts on specific rate plans,
		// price rise engine, and other billing variations
		// Find discount invoice items in the preview - these show the actual discount that would be applied
		const discountInvoiceItems = invoice.invoiceItems.filter(
			(item) => item.productName === 'Discounts',
		);

		// Calculate the current monthly cost with discounts applied
		// This is what the customer currently pays per month
		const currentMonthlyAmountWithDiscount = discountInvoiceItems.reduce(
			(total, item) => total + item.amountWithoutTax,
			currentPrice,
		);

		// Calculate the annualized discount value
		// If they currently pay less than the full price monthly, calculate how much they save per year
		const monthlyDiscountAmount =
			currentPrice - currentMonthlyAmountWithDiscount;
		const currentDiscountAmount = monthlyDiscountAmount * 12;

		return {
			currency: switchInfo.currency,
			savings: {
				amount: savingsAmount,
				period: savingsPeriod,
			},
			newPrice: {
				amount: switchInfo.targetPrice,
				period: newPricePeriod,
			},
			currentContribution: {
				amount: currentContributionAmount,
				period: 'month',
			},
			currentDiscount: {
				amount: Math.round(currentDiscountAmount * 100) / 100,
				period: 'year',
			},
		};
	} catch (error) {
		// Only return ValidationError messages to clients for security
		if (error instanceof ValidationError) {
			return {
				reasons: [{ message: error.message }],
			};
		}

		throw new Error('Unexpected error type in frequency switch preview', {
			cause: error,
		});
	}
}

/**
 * Execute a frequency switch (non-preview).
 * Prepares the switch info and executes the order request to perform the actual switch.
 */
export async function executeFrequencySwitch(
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	candidateCharge: { ratePlan: RatePlan; charge: RatePlanCharge },
	productCatalog: ProductCatalog,
	today: dayjs.Dayjs,
): Promise<FrequencySwitchResponse> {
	const { ratePlan, charge } = candidateCharge;
	logger.log('Executing frequency switch (Orders API) from Monthly to Annual');

	try {
		// Use chargedThroughDate as the effective date - this is when the current billing period ends
		// and the next payment will be due. Since SupporterPlus subscriptions don't have free periods
		// (discounts reduce price but don't make invoices free), this avoids an extra billing preview API call.
		const effectiveDate = dayjs(charge.chargedThroughDate ?? today);

		const switchInfo = prepareFrequencySwitchInfo(
			ratePlan,
			charge,
			subscription,
			productCatalog,
			effectiveDate,
			today,
		);

		const orderRequest: CreateOrderRequest = {
			processingOptions: {
				runBilling: false,
				collectPayment: false,
			},
			orderDate: zuoraDateFormat(switchInfo.effectiveDate),
			existingAccountNumber: subscription.accountNumber,
			subscriptions: [
				{
					subscriptionNumber: subscription.subscriptionNumber,
					orderActions: switchInfo.orderActions,
				},
			],
		};

		const zuoraResponse: ZuoraSwitchResponse = await executeOrderRequest(
			zuoraClient,
			orderRequest,
			zuoraSwitchResponseSchema,
		);

		return {
			invoiceIds: zuoraResponse.invoiceIds ?? [],
		};
	} catch (error) {
		// Only return ValidationError messages to clients for security
		if (error instanceof ValidationError) {
			return {
				reasons: [{ message: error.message }],
			};
		}

		throw new Error('Unexpected error type in frequency switch execution', {
			cause: error,
		});
	}
}

/**
 * Get the appropriate product rate plan Id for switching to Annual billing.
 * Uses an allowlist of valid frequency switches to ensure only supported switches are permitted.
 * Currently only supports Monthly to Annual switches for SupporterPlus.
 *
 * @param productCatalog Product catalog to look up rate plans
 * @param currentRatePlan Current rate plan from the subscription (contains productRatePlanId)
 * @returns Product rate plan Id for the Annual billing period
 * @throws Error if the switch is not in the allowlist
 */
function getTargetRatePlanId(
	productCatalog: ProductCatalog,
	currentRatePlan: RatePlan,
): string {
	const validSwitches: Record<string, string> = {
		[productCatalog.SupporterPlus.ratePlans.Monthly.id]:
			productCatalog.SupporterPlus.ratePlans.Annual.id,
	};

	return getIfDefined(
		validSwitches[currentRatePlan.productRatePlanId],
		`Product rate plan ID '${currentRatePlan.productRatePlanId}' does not have a valid switch to Annual billing`,
	);
}

export const frequencySwitchHandler =
	(stage: Stage, today: dayjs.Dayjs) =>
	async (
		event: unknown,
		parsed: {
			path: { subscriptionNumber: string };
			body: FrequencySwitchRequestBody;
		},
	): Promise<{ statusCode: number; body: string }> => {
		logger.mutableAddContext(parsed.path.subscriptionNumber);
		const todayDate = today.toDate();

		const zuoraClient = await ZuoraClient.create(stage);
		const subscription = await getSubscription(
			zuoraClient,
			parsed.path.subscriptionNumber,
		);

		// Extract identity ID from headers and validate ownership
		const identityId = (
			event as { headers?: Record<string, string | undefined> }
		).headers?.['x-identity-id'];
		const account = await getAccount(zuoraClient, subscription.accountNumber);

		if (identityId && account.basicInfo.identityId !== identityId) {
			logger.log(
				`Subscription ${parsed.path.subscriptionNumber} does not belong to identity ID ${identityId}`,
			);
			return {
				statusCode: 403,
				body: JSON.stringify({
					reasons: [
						{
							message: `Subscription ${parsed.path.subscriptionNumber} does not belong to the currently logged-in user`,
						},
					],
				}),
			};
		}

		const productCatalog = await getProductCatalogFromApi(stage);

		// Use selectCandidateSubscriptionCharge to validate and find the eligible charge
		let candidateCharge: { ratePlan: RatePlan; charge: RatePlanCharge };
		try {
			candidateCharge = selectCandidateSubscriptionCharge(
				subscription,
				todayDate,
				account,
				productCatalog,
			);
		} catch (error) {
			logger.log(
				'Failed to select candidate charge for frequency switch.',
				error,
			);
			// Only return ValidationError messages to clients for security
			if (error instanceof ValidationError) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						reasons: [{ message: error.message }],
					}),
				};
			}

			// The router will do log-and-500 for free
			throw error;
		}

		const { charge } = candidateCharge;

		if (charge.billingPeriod === parsed.body.targetBillingPeriod) {
			logger.log(
				`Charge ${charge.id} already has billing period ${charge.billingPeriod}, no switch needed.`,
			);
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: 'Charge already matches target billing period.',
				}),
			};
		}

		const response = parsed.body.preview
			? await previewFrequencySwitch(
					zuoraClient,
					subscription,
					candidateCharge,
					productCatalog,
					today,
				)
			: await executeFrequencySwitch(
					zuoraClient,
					subscription,
					candidateCharge,
					productCatalog,
					today,
				);

		const isErrorResponse =
			frequencySwitchErrorResponseSchema.safeParse(response).success;
		const statusCode = isErrorResponse ? 400 : 200;
		return { statusCode, body: JSON.stringify(response) };
	};
