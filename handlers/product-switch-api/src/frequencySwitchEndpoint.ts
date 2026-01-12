import { ValidationError } from '@modules/errors';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { isoCurrencySchema } from '@modules/internationalisation/schemas';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import {
	getBillingPreview,
	getNextInvoiceItems,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
import type { OrderAction } from '@modules/zuora/orders/orderActions';
import { singleTriggerDate } from '@modules/zuora/orders/orderActions';
import type {
	CreateOrderRequest,
	OrderRequest,
	PreviewOrderRequest,
} from '@modules/zuora/orders/orderRequests';
import {
	executeOrderRequest,
	previewOrderRequest,
} from '@modules/zuora/orders/orderRequests';
import type { ZuoraAccount } from '@modules/zuora/types';
import type {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/types/objects/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { EligibilityChecker } from '../../discount-api/src/eligibilityChecker';
import { sendFrequencySwitchConfirmationEmail } from './frequencySwitchEmail';
import type {
	FrequencySwitchErrorResponse,
	FrequencySwitchPreviewSuccessResponse,
	FrequencySwitchRequestBody,
	FrequencySwitchSuccessResponse,
} from './frequencySwitchSchemas';
import type { ZuoraPreviewResponse } from './schemas';
import {
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from './schemas';

/**
 * Validation requirements for frequency switch eligibility.
 * Each requirement includes a description of what must pass and details about why.
 *
 * Note: Standard eligibility checks (subscription active, zero account balance, no negative invoice items,
 * next invoice > 0) are performed by EligibilityChecker.assertGenerallyEligible()
 */
export const frequencySwitchValidationRequirements = {
	hasEligibleCharges:
		'subscription has at least one active recurring charge eligible for frequency switch',
	chargeHasValidPrice: 'eligible charge has a defined price',
	zeroContributionAmount:
		'contribution amount is zero (non-zero contributions cannot be preserved during frequency switch)',
};

/**
 * Assert that a condition is valid for frequency switch eligibility.
 * Throws ValidationError if condition fails, capturing the requirement and actual value.
 *
 * @param isValid Whether the validation passed
 * @param requirement Description of the requirement from frequencySwitchValidationRequirements
 * @param actual The actual value that failed validation
 * @throws ValidationError with formatted message including requirement and actual value
 */
function assertValidState(
	isValid: boolean,
	requirement: string,
	actual: string,
): asserts isValid {
	logger.log(`Asserting <${requirement}>`);
	if (!isValid) {
		const message = `subscription did not meet precondition <${requirement}> (was ${actual})`;
		logger.log(`FAILED: ${message}`);
		throw new ValidationError(message);
	}
}

/**
 * Select the SupporterPlus Monthly rate plan and its subscription charge eligible for a frequency switch.
 * Uses the product catalog to find the exact rate plan to switch to, validating both the rate plan
 * and its charges as a unit. This approach is more deterministic than filtering all charges.
 *
 * Validates that the subscription is eligible:
 * - Standard eligibility via EligibilityChecker.assertGenerallyEligible():
 *   - Subscription status is Active
 *   - Account balance is zero (no unpaid invoices)
 *   - No negative items in next invoice preview (no refunds/discounts expected)
 *   - Next invoice total is greater than zero
 * - Must have a SupporterPlus Monthly rate plan that is active
 * - The rate plan must have a valid Subscription charge with valid dates and billing period
 * - Contribution amount must be zero (non-zero contributions cannot be preserved)
 *
 * @param subscription The subscription to validate
 * @param today Today's date for filtering active charges
 * @param account Account data for eligibility validations
 * @param productCatalog The product catalog for looking up the target rate plan
 * @param zuoraClient Zuora client for fetching billing preview data
 * @returns The selected rate plan and charge eligible for frequency switch
 * @throws ValidationError if subscription fails any validation checks
 */
export async function selectCandidateSubscriptionCharge(
	subscription: ZuoraSubscription,
	today: dayjs.Dayjs,
	account: ZuoraAccount,
	productCatalog: ProductCatalog,
	zuoraClient: ZuoraClient,
): Promise<{ ratePlan: RatePlan; charge: RatePlanCharge }> {
	const eligibilityChecker = new EligibilityChecker();

	await eligibilityChecker.assertGenerallyEligible(
		subscription,
		account.metrics.totalInvoiceBalance,
		async () => {
			const billingPreview = await getBillingPreview(
				zuoraClient,
				today.add(13, 'months'),
				subscription.accountNumber,
			);
			const invoiceItems = toSimpleInvoiceItems(
				itemsForSubscription(subscription.subscriptionNumber)(billingPreview),
			);
			return getNextInvoiceItems(invoiceItems);
		},
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

	const todayDate = today.toDate();
	assertValidState(
		subscriptionCharge.effectiveStartDate < todayDate,
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`effectiveStartDate ${subscriptionCharge.effectiveStartDate.toISOString()} is in the future (e.g. pending price rise)`,
	);

	assertValidState(
		subscriptionCharge.effectiveEndDate >= todayDate,
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`effectiveEndDate ${subscriptionCharge.effectiveEndDate.toISOString()} is in the past`,
	);

	// this should always be the case if the bill runs are working, but checking for safety
	assertValidState(
		!subscriptionCharge.chargedThroughDate ||
			subscriptionCharge.chargedThroughDate >= todayDate,
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`chargedThroughDate ${subscriptionCharge.chargedThroughDate?.toISOString()} is in the past`,
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

	// Note: discount eligibility is already checked by EligibilityChecker.assertGenerallyEligible()
	// which validates that the next invoice has no negative items (discounts/refunds)

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
	orderActions: OrderAction[];
}

/**
 * Prepare common information for a frequency switch.
 * Gets target rate plan, price, effective date, and builds order actions including
 * term renewal (if needed) and plan change.
 *
 * @param currentRatePlan The current rate plan from the subscription
 * @param currentCharge The current charge eligible for switching
 * @param subscription The subscription being switched
 * @param productCatalog Product catalog for looking up rate plans and pricing
 * @param effectiveDate The date when the switch should take effect
 * @returns Common information needed for preview or execute
 */
function prepareFrequencySwitchInfo(
	currentRatePlan: RatePlan,
	currentCharge: RatePlanCharge,
	subscription: ZuoraSubscription,
	productCatalog: ProductCatalog,
	effectiveDate: dayjs.Dayjs,
): FrequencySwitchInfo {
	const targetRatePlanId = getTargetRatePlanId(productCatalog, currentRatePlan);

	// Frequency switches are Supporter Plus specific, so directly access the Annual rate plan
	const currency = isoCurrencySchema.parse(currentCharge.currency);
	const targetPrice =
		productCatalog.SupporterPlus.ratePlans.Annual.pricing[currency];

	const triggerDates = singleTriggerDate(effectiveDate);

	// Check if we need term renewal to avoid "cancellation date cannot be later than term end date" error
	// We need to perform term renewal if the chargedThroughDate (which will be used as the effective date)
	// extends beyond the current subscription term end date.
	const termEndDate = dayjs(subscription.termEndDate);
	const needsTermRenewal = effectiveDate.isAfter(termEndDate);

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
		orderActions,
	};
}

/**
 * Preview a frequency switch for a subscription.
 * Prepares the switch info and runs a preview order request to calculate savings and new price.
 */
export async function previewFrequencySwitch(
	baseOrderRequest: OrderRequest,
	zuoraClient: ZuoraClient,
	candidateCharge: { ratePlan: RatePlan; charge: RatePlanCharge },
	productCatalog: ProductCatalog,
	effectiveDate: dayjs.Dayjs,
	switchInfo: FrequencySwitchInfo,
): Promise<FrequencySwitchPreviewSuccessResponse> {
	logger.log('Previewing frequency switch (Orders API) from Monthly to Annual');

	const orderRequest: PreviewOrderRequest = {
		previewOptions: {
			previewThruType: 'SpecificDate',
			previewTypes: ['BillingDocs'],
			specificPreviewThruDate: zuoraDateFormat(effectiveDate.add(1, 'month')),
		},
		...baseOrderRequest,
	};

	const zuoraPreview: ZuoraPreviewResponse = await previewOrderRequest(
		zuoraClient,
		orderRequest,
		zuoraPreviewResponseSchema,
	);

	logger.log('Orders preview returned successful response', zuoraPreview);

	const { ratePlan, charge } = candidateCharge;

	// Calculate savings and new price for monthly to annual switch
	// charge.price is guaranteed to be non-null by selectCandidateSubscriptionCharge validation
	const currentPrice = charge.price!;
	const currentAnnualCost = currentPrice * 12;
	const targetAnnualCost = switchInfo.targetPrice;
	const savingsAmount = currentAnnualCost - targetAnnualCost;
	const savingsPeriod = 'year' as const;
	const newPricePeriod = 'year' as const;

	// Calculate current contribution using catalog ID to identify the charge
	const contributionChargeId =
		productCatalog.SupporterPlus.ratePlans.Monthly.charges.Contribution.id;
	const contributionCharges = ratePlan.ratePlanCharges.filter(
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
	};
}

/**
 * Execute a frequency switch (non-preview).
 * Prepares the switch info and executes the order request to perform the actual switch.
 */
export async function executeFrequencySwitch(
	baseOrderRequest: OrderRequest,
	zuoraClient: ZuoraClient,
): Promise<FrequencySwitchSuccessResponse> {
	logger.log('Executing frequency switch (Orders API) from Monthly to Annual');

	const orderRequest: CreateOrderRequest = {
		processingOptions: {
			runBilling: false,
			collectPayment: false,
		},
		...baseOrderRequest,
	};

	await executeOrderRequest(
		zuoraClient,
		orderRequest,
		zuoraSwitchResponseSchema,
	);

	return {};
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

export async function getSwitchResult(
	stage: Stage,
	today: dayjs.Dayjs,
	isPreview: boolean,
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	account: ZuoraAccount,
): Promise<
	FrequencySwitchPreviewSuccessResponse | FrequencySwitchSuccessResponse
> {
	const productCatalog = await getProductCatalogFromApi(stage);

	// Use selectCandidateSubscriptionCharge to validate and find the eligible charge
	const candidateCharge = await selectCandidateSubscriptionCharge(
		subscription,
		today,
		account,
		productCatalog,
		zuoraClient,
	);

	const effectiveDate = dayjs(
		candidateCharge.charge.chargedThroughDate ?? today,
	);

	const switchInfo = prepareFrequencySwitchInfo(
		candidateCharge.ratePlan,
		candidateCharge.charge,
		subscription,
		productCatalog,
		effectiveDate,
	);

	const baseOrderRequest: OrderRequest = {
		orderDate: zuoraDateFormat(effectiveDate),
		existingAccountNumber: subscription.accountNumber,
		subscriptions: [
			{
				subscriptionNumber: subscription.subscriptionNumber,
				orderActions: switchInfo.orderActions,
			},
		],
	};

	if (isPreview) {
		return await previewFrequencySwitch(
			baseOrderRequest,
			zuoraClient,
			candidateCharge,
			productCatalog,
			effectiveDate,
			switchInfo,
		);
	}

	const result = await executeFrequencySwitch(baseOrderRequest, zuoraClient);

	// Send confirmation email after successful switch
	// Use Promise.allSettled to prevent email failures from breaking the switch
	await Promise.allSettled([
		sendFrequencySwitchConfirmationEmail(
			stage,
			subscription,
			account,
			switchInfo.currency,
			switchInfo.targetPrice,
			effectiveDate,
		),
	]);

	return result;
}

export const frequencySwitchHandler =
	(stage: Stage, today: dayjs.Dayjs) =>
	async (
		body: FrequencySwitchRequestBody,
		zuoraClient: ZuoraClient,
		subscription: ZuoraSubscription,
		account: ZuoraAccount,
	): Promise<{ statusCode: number; body: string }> => {
		return {
			statusCode: 500,
			body: JSON.stringify({
				reason: 'Testing failure response',
			} satisfies FrequencySwitchErrorResponse),
		};

		try {
			const response = await getSwitchResult(
				stage,
				today,
				body.preview,
				zuoraClient,
				subscription,
				account,
			);

			return { statusCode: 200, body: JSON.stringify(response) };
		} catch (error) {
			// Only return ValidationError messages to clients for security
			if (error instanceof ValidationError) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						reason: 'error.message',
					} satisfies FrequencySwitchErrorResponse),
				};
			}

			throw new Error(
				`Unexpected error type in frequency switch: preview=${body.preview}`,
				{
					cause: error,
				},
			);
		}
	};
