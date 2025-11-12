import { ValidationError } from '@modules/errors';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
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
import type {
	RatePlan,
	RatePlanCharge,
} from '@modules/zuora/types/objects/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { getCatalogRatePlanName } from './catalogInformation';
import type {
	FrequencyChangePreviewResponse,
	FrequencyChangeRequestBody,
	FrequencyChangeSwitchResponse,
} from './frequencySchemas';
import {
	frequencyChangeErrorResponseSchema,
	frequencyChangePreviewResponseSchema,
	frequencyChangeSwitchResponseSchema,
} from './frequencySchemas';
import type { ZuoraPreviewResponse, ZuoraSwitchResponse } from './schemas';
import {
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from './schemas';

/**
 * Validation requirements for frequency change eligibility.
 * Each requirement includes a description of what must pass and details about why.
 */
export const frequencyChangeValidationRequirements = {
	subscriptionActive: 'subscription status is active',
	zeroAccountBalance: 'account balance is zero',
	hasEligibleCharges:
		'subscription has at least one active recurring charge eligible for frequency change',
	singleEligibleCharge:
		'subscription has exactly one eligible charge (multiple charges cannot be safely changed)',
};

/**
 * Assert that a condition is valid for frequency change eligibility.
 * Throws ValidationError if condition fails, capturing the requirement and actual value.
 *
 * @param isValid Whether the validation passed
 * @param requirement Description of the requirement from frequencyChangeValidationRequirements
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
 * Select the single candidate rate plan and charge eligible for a frequency change.
 * Logic matches the handler implementation so tests can exercise preview/execute flows without duplicating filtering rules.
 *
 * Validates that the subscription is eligible:
 * - Must be Active status
 * - Must not have outstanding unpaid invoices (totalInvoiceBalance must be 0)
 * - Must have exactly one recurring subscription charge with valid dates and billing period
 *
 * @param subscription The subscription to validate
 * @param today Today's date for filtering active charges
 * @param account Optional account data for additional validations
 * @returns The selected rate plan and charge eligible for frequency change
 * @throws ValidationError if subscription fails any validation checks
 */
export function selectCandidateSubscriptionCharge(
	subscription: Awaited<ReturnType<typeof getSubscription>>,
	today: Date,
	account?: Awaited<ReturnType<typeof getAccount>>,
): { ratePlan: RatePlan; charge: RatePlanCharge } {
	// Check subscription status if account is provided
	if (account) {
		assertValidState(
			subscription.status === 'Active',
			frequencyChangeValidationRequirements.subscriptionActive,
			subscription.status,
		);
	}

	// Check for outstanding unpaid invoices if account is provided
	if (account) {
		assertValidState(
			account.metrics.totalInvoiceBalance === 0,
			frequencyChangeValidationRequirements.zeroAccountBalance,
			`${account.metrics.totalInvoiceBalance} ${account.metrics.currency}`,
		);
	}

	const candidateCharges = subscription.ratePlans
		.filter((rp) => rp.lastChangeType !== 'Remove')
		.flatMap((rp) =>
			rp.ratePlanCharges.map((c) => ({ ratePlan: rp, charge: c })),
		)
		.filter(({ charge }) => charge.name === 'Subscription')
		.filter(({ charge }) => charge.type === 'Recurring')
		.filter(
			({ charge }) =>
				charge.effectiveStartDate <= today && charge.effectiveEndDate > today,
		)
		.filter(
			({ charge }) =>
				!charge.chargedThroughDate || charge.chargedThroughDate >= today,
		)
		.filter(
			({ charge }) =>
				charge.billingPeriod === 'Month' || charge.billingPeriod === 'Annual',
		);

	assertValidState(
		candidateCharges.length > 0,
		frequencyChangeValidationRequirements.hasEligibleCharges,
		`${candidateCharges.length} charges found`,
	);

	assertValidState(
		candidateCharges.length === 1,
		frequencyChangeValidationRequirements.singleEligibleCharge,
		`${candidateCharges.length} charges found`,
	);

	return candidateCharges[0]!;
}

/**
 * Preview a frequency change for a subscription. Mirrors processFrequencyChange with preview=true.
 */
export async function previewFrequencyChange(
	zuoraClient: ZuoraClient,
	subscription: Awaited<ReturnType<typeof getSubscription>>,
	candidateCharge: { ratePlan: RatePlan; charge: RatePlanCharge },
	productCatalog: ProductCatalog,
	targetBillingPeriod: 'Month' | 'Annual',
): Promise<FrequencyChangePreviewResponse> {
	const { ratePlan, charge } = candidateCharge;
	const result = await processFrequencyChange(
		zuoraClient,
		subscription,
		ratePlan,
		charge,
		productCatalog,
		targetBillingPeriod,
		true,
	);
	return frequencyChangePreviewResponseSchema.parse(result);
}

/**
 * Execute a frequency change (non-preview). Mirrors processFrequencyChange with preview=false.
 */
export async function executeFrequencyChange(
	zuoraClient: ZuoraClient,
	subscription: Awaited<ReturnType<typeof getSubscription>>,
	candidateCharge: { ratePlan: RatePlan; charge: RatePlanCharge },
	productCatalog: ProductCatalog,
	targetBillingPeriod: 'Month' | 'Annual',
): Promise<FrequencyChangeSwitchResponse> {
	const { ratePlan, charge } = candidateCharge;
	const result = await processFrequencyChange(
		zuoraClient,
		subscription,
		ratePlan,
		charge,
		productCatalog,
		targetBillingPeriod,
		false,
	);
	return frequencyChangeSwitchResponseSchema.parse(result);
}

/**
 * Get the appropriate product rate plan Id for the target billing period
 * Uses the productRatePlanId to look up the product in the catalog (more reliable than productName)
 * and retrieves the product rate plan Id for the target billing period.
 *
 * @param productCatalog Product catalog to look up rate plans
 * @param currentRatePlan Current rate plan from the subscription (contains productRatePlanId)
 * @param targetBillingPeriod Target billing period ('Month' or 'Annual')
 * @returns Product rate plan Id for the target billing period
 * @throws Error if product details cannot be found or target rate plan doesn't exist
 */
function getTargetRatePlanId(
	productCatalog: ProductCatalog,
	currentRatePlan: RatePlan,
	targetBillingPeriod: 'Month' | 'Annual',
): string {
	const productCatalogHelper = new ProductCatalogHelper(productCatalog);

	logger.log(
		`Finding target rate plan for productRatePlanId: ${currentRatePlan.productRatePlanId}`,
	);

	const productDetails = productCatalogHelper.findProductDetails(
		currentRatePlan.productRatePlanId,
	);

	if (!productDetails) {
		throw new Error(
			`Product rate plan ID '${currentRatePlan.productRatePlanId}' not found in product catalog`,
		);
	}

	const targetRatePlanKey = getCatalogRatePlanName(targetBillingPeriod);
	logger.log(
		`Determined target rate plan key '${targetRatePlanKey}' for requested billing period '${targetBillingPeriod}'`,
	);

	const product = productCatalog[productDetails.zuoraProduct];
	const ratePlan = product.ratePlans[
		targetRatePlanKey as keyof typeof product.ratePlans
	] as { id: string } | undefined;

	if (!ratePlan) {
		throw new Error(
			`Rate plan ${targetRatePlanKey} not found for product ${productDetails.zuoraProduct}`,
		);
	}

	return ratePlan.id;
}

/**
 * Process a frequency change using Zuora Orders API.
 *
 * @param zuoraClient Zuora API client
 * @param subscription Subscription to change
 * @param currentRatePlan Current rate plan of the subscription
 * @param currentCharge Current charge of the subscription
 * @param productCatalog Product catalog for rate plan lookups
 * @param targetBillingPeriod Target billing period ('Month' or 'Annual')
 * @param preview Whether to preview or execute the change
 * @returns Frequency change response indicating success/failure and details
 */
async function processFrequencyChange(
	zuoraClient: ZuoraClient,
	subscription: Awaited<ReturnType<typeof getSubscription>>,
	currentRatePlan: RatePlan,
	currentCharge: RatePlanCharge,
	productCatalog: ProductCatalog,
	targetBillingPeriod: 'Month' | 'Annual',
	preview: boolean,
): Promise<FrequencyChangePreviewResponse | FrequencyChangeSwitchResponse> {
	const currentBillingPeriod = currentCharge.billingPeriod as
		| 'Month'
		| 'Annual';
	logger.log(
		`${preview ? 'Previewing' : 'Executing'} frequency change (Orders API) from ${currentBillingPeriod} to ${targetBillingPeriod}`,
	);

	try {
		const targetRatePlanId = getTargetRatePlanId(
			productCatalog,
			currentRatePlan,
			targetBillingPeriod,
		);
		const targetRatePlanKey = getCatalogRatePlanName(targetBillingPeriod);

		const productCatalogHelper = new ProductCatalogHelper(productCatalog);
		const productDetails = productCatalogHelper.findProductDetails(
			currentRatePlan.productRatePlanId,
		);

		if (!productDetails) {
			throw new Error(
				`Product rate plan ID '${currentRatePlan.productRatePlanId}' not found in product catalog during order construction`,
			);
		}

		const targetProduct = productCatalog[productDetails.zuoraProduct];

		const rawTargetRatePlan = targetProduct.ratePlans[
			targetRatePlanKey as keyof typeof targetProduct.ratePlans
		] as {
			charges: Record<string, { id: string }>;
			pricing?: Record<string, number>;
		};
		const targetSubscriptionChargeIdRaw =
			rawTargetRatePlan.charges.Subscription?.id ??
			Object.values(rawTargetRatePlan.charges)[0]?.id;
		if (!targetSubscriptionChargeIdRaw) {
			throw new Error('Unable to determine target subscription charge id');
		}
		const targetSubscriptionChargeId: string = targetSubscriptionChargeIdRaw;
		const currency: string = currentCharge.currency;
		const targetPrice =
			rawTargetRatePlan.pricing?.[currency] ?? currentCharge.price ?? 0;

		// For preview: use today to get Zuora to generate billing docs
		// For execution: use charged through date so change takes effect at next renewal
		const effectiveDate = preview
			? dayjs()
			: dayjs(currentCharge.chargedThroughDate ?? subscription.termEndDate);
		const triggerDates = singleTriggerDate(effectiveDate);
		const orderActions: OrderAction[] = [
			{
				type: 'ChangePlan',
				triggerDates,
				changePlan: {
					productRatePlanId: currentRatePlan.productRatePlanId,
					subType: 'Upgrade',
					newProductRatePlan: {
						productRatePlanId: targetRatePlanId,
						chargeOverrides: [
							{
								productRatePlanChargeId: targetSubscriptionChargeId,
								pricing: { recurringFlatFee: { listPrice: targetPrice } },
							},
						],
					},
				},
			},
		];

		if (preview) {
			// Preview with today's date to get Zuora to generate invoices
			// Then filter to show only the new billing period charges (exclude credits/prorations)
			const orderRequest: PreviewOrderRequest = {
				previewOptions: {
					previewThruType: 'SpecificDate',
					previewTypes: ['BillingDocs'],
					specificPreviewThruDate: zuoraDateFormat(
						effectiveDate.add(1, 'month'),
					),
				},
				orderDate: zuoraDateFormat(effectiveDate),
				existingAccountNumber: subscription.accountNumber,
				subscriptions: [
					{
						subscriptionNumber: subscription.subscriptionNumber,
						orderActions,
					},
				],
			};

			const zuoraPreview: ZuoraPreviewResponse = await previewOrderRequest(
				zuoraClient,
				orderRequest,
				zuoraPreviewResponseSchema,
			);

			if (!zuoraPreview.success) {
				logger.log(
					'Orders preview returned unsuccessful response',
					zuoraPreview,
				);
				return {
					reasons: zuoraPreview.reasons?.map((r: { message: string }) => ({
						message: r.message,
					})) ?? [{ message: 'Unknown error from Zuora preview' }],
				};
			}

			logger.log('Orders preview returned successful response', zuoraPreview);

			// Filter invoice items to show only the new billing period charges
			// Exclude credits/prorations from the old billing period
			const cleanedInvoices =
				zuoraPreview.previewResult?.invoices.map((invoice) => ({
					...invoice,
					invoiceItems: invoice.invoiceItems.filter(
						(item) =>
							// Keep items with positive amounts (new charges)
							// or items matching the target rate plan charge
							item.amountWithoutTax >= 0 &&
							item.productRatePlanChargeId === targetSubscriptionChargeId,
					),
				})) ?? [];

			// Calculate savings and new price based on the target billing period
			const currentPrice = currentCharge.price ?? 0;
			let savingsAmount: number;
			let savingsPeriod: 'year' | 'month';
			let newPriceAmount: number;
			let newPricePeriod: 'year' | 'month';

			if (targetBillingPeriod === 'Annual') {
				// Monthly → Annual: show annual savings and annual price
				const currentAnnualCost = currentPrice * 12;
				const targetAnnualCost = targetPrice;
				savingsAmount = currentAnnualCost - targetAnnualCost;
				savingsPeriod = 'year';
				newPriceAmount = targetAnnualCost;
				newPricePeriod = 'year';
			} else {
				// Annual → Monthly: show monthly savings and monthly price
				const currentMonthlyCost = currentPrice / 12;
				const targetMonthlyCost = targetPrice;
				savingsAmount = currentMonthlyCost - targetMonthlyCost;
				savingsPeriod = 'month';
				newPriceAmount = targetMonthlyCost;
				newPricePeriod = 'month';
			}

			return {
				previewInvoices: cleanedInvoices,
				savings: {
					amount: savingsAmount,
					currency,
					period: savingsPeriod,
				},
				newPrice: {
					amount: newPriceAmount,
					currency,
					period: newPricePeriod,
				},
			};
		} else {
			const orderRequest: CreateOrderRequest = {
				processingOptions: {
					runBilling: true,
					collectPayment: false,
				},
				orderDate: zuoraDateFormat(effectiveDate),
				existingAccountNumber: subscription.accountNumber,
				subscriptions: [
					{
						subscriptionNumber: subscription.subscriptionNumber,
						orderActions,
					},
				],
			};

			const zuoraResponse: ZuoraSwitchResponse = await executeOrderRequest(
				zuoraClient,
				orderRequest,
				zuoraSwitchResponseSchema,
			);

			if (!zuoraResponse.success) {
				logger.log(
					'Orders execution returned unsuccessful response',
					zuoraResponse,
				);
				return {
					reasons: zuoraResponse.reasons?.map((r: { message: string }) => ({
						message: r.message,
					})) ?? [{ message: 'Unknown error from Zuora execution' }],
				};
			}

			return {
				invoiceIds: zuoraResponse.invoiceIds ?? [],
			};
		}
	} catch (error) {
		logger.log(
			`Error during Orders API frequency change ${preview ? 'preview' : 'execute'}`,
			error,
		);
		// Only return ValidationError messages to clients for security
		if (error instanceof ValidationError) {
			return {
				reasons: [{ message: error.message }],
			};
		}
		// Log unexpected errors but don't expose details to client
		logger.log('Unexpected error type in frequency change processing', error);
		return {
			reasons: [
				{
					message: 'An unexpected error occurred while processing your request',
				},
			],
		};
	}
}

/**
 * Frequency change handler
 *
 * @param stage Stage to execute in
 * @param today Today's date
 * @returns Http handler function for status code and body return
 */
export const frequencyChangeHandler =
	(stage: Stage, today: dayjs.Dayjs) =>
	async (
		event: unknown,
		parsed: {
			path: { subscriptionNumber: string };
			body: FrequencyChangeRequestBody;
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
			);
		} catch (error) {
			logger.log(
				'Failed to select candidate charge for frequency change.',
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
			// Log unexpected errors but don't expose details to client
			logger.log('Unexpected error type in candidate charge selection', error);
			return {
				statusCode: 500,
				body: JSON.stringify({
					reasons: [
						{
							message:
								'An unexpected error occurred while processing your request',
						},
					],
				}),
			};
		}

		const { charge } = candidateCharge;

		if (charge.billingPeriod === parsed.body.targetBillingPeriod) {
			logger.log(
				`Charge ${charge.id} already has billing period ${charge.billingPeriod}, no change needed.`,
			);
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: 'Charge already matches target billing period.',
				}),
			};
		}

		const response = parsed.body.preview
			? await previewFrequencyChange(
					zuoraClient,
					subscription,
					candidateCharge,
					productCatalog,
					parsed.body.targetBillingPeriod,
				)
			: await executeFrequencyChange(
					zuoraClient,
					subscription,
					candidateCharge,
					productCatalog,
					parsed.body.targetBillingPeriod,
				);

		const isErrorResponse =
			frequencyChangeErrorResponseSchema.safeParse(response).success;
		const statusCode = isErrorResponse ? 400 : 200;
		return { statusCode, body: JSON.stringify(response) };
	};
