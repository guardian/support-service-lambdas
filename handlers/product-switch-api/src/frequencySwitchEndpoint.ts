import { assertValueIn } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { isNonEmpty } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import {
	getBillingPreview,
	getNextNonFreePaymentDate,
	itemsForSubscription,
	toSimpleInvoiceItems,
} from '@modules/zuora/billingPreview';
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
import { getCatalogRatePlanName } from './catalogInformation';
import type {
	FrequencySwitchPreviewResponse,
	FrequencySwitchRequestBody,
	FrequencySwitchResponse,
} from './frequencySwitchSchemas';
import {
	frequencySwitchErrorResponseSchema,
	frequencySwitchPreviewResponseSchema,
	frequencySwitchResponseSchema,
} from './frequencySwitchSchemas';
import type { ZuoraPreviewResponse, ZuoraSwitchResponse } from './schemas';
import {
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from './schemas';

/**
 * Validation requirements for frequency switch eligibility.
 * Each requirement includes a description of what must pass and details about why.
 */
export const frequencySwitchValidationRequirements = {
	subscriptionActive: 'subscription status is active',
	zeroAccountBalance: 'account balance is zero',
	hasEligibleCharges:
		'subscription has at least one active recurring charge eligible for frequency switch',
	singleEligibleCharge:
		'subscription has exactly one eligible charge (multiple charges cannot be safely switched)',
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
 * Select the single candidate rate plan and charge eligible for a frequency switch.
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
 * @returns The selected rate plan and charge eligible for frequency switch
 * @throws ValidationError if subscription fails any validation checks
 */
export function selectCandidateSubscriptionCharge(
	subscription: ZuoraSubscription,
	today: Date,
	account: ZuoraAccount,
): { ratePlan: RatePlan; charge: RatePlanCharge } {
	assertValidState(
		subscription.status === 'Active',
		frequencySwitchValidationRequirements.subscriptionActive,
		subscription.status,
	);

	assertValidState(
		account.metrics.totalInvoiceBalance === 0,
		frequencySwitchValidationRequirements.zeroAccountBalance,
		`${account.metrics.totalInvoiceBalance} ${account.metrics.currency}`,
	);

	// Log diagnostic info about which charges are being filtered
	const initialCharges = subscription.ratePlans
		.filter((rp) => rp.lastChangeType !== 'Remove')
		.flatMap((rp) =>
			rp.ratePlanCharges.map((c) => ({ ratePlan: rp, charge: c })),
		);

	logger.log(
		`Found ${initialCharges.length} rate plan charges before filtering`,
	);

	const candidateCharges = initialCharges
		.filter(({ charge }) => {
			if (charge.name !== 'Subscription') {
				logger.log(
					`Filtering out charge ${charge.id}: name is "${charge.name}", not "Subscription"`,
				);
				return false;
			}
			return true;
		})
		.filter(({ charge }) => {
			if (charge.type !== 'Recurring') {
				logger.log(
					`Filtering out charge ${charge.id}: type is "${charge.type}", not "Recurring"`,
				);
				return false;
			}
			return true;
		})
		.filter(({ charge }) => {
			if (charge.effectiveStartDate >= today) {
				logger.log(
					`Filtering out charge ${charge.id}: effectiveStartDate ${charge.effectiveStartDate.toISOString()} is in the future`,
				);
				return false;
			}
			if (charge.effectiveEndDate < today) {
				logger.log(
					`Filtering out charge ${charge.id}: effectiveEndDate ${charge.effectiveEndDate.toISOString()} is in the past`,
				);
				return false;
			}
			return true;
		})
		.filter(({ charge }) => {
			if (charge.chargedThroughDate && charge.chargedThroughDate < today) {
				logger.log(
					`Filtering out charge ${charge.id}: chargedThroughDate ${charge.chargedThroughDate.toISOString()} is in the past`,
				);
				return false;
			}
			return true;
		})
		.filter(({ charge }) => {
			if (
				charge.billingPeriod !== 'Month' &&
				charge.billingPeriod !== 'Annual'
			) {
				logger.log(
					`Filtering out charge ${charge.id}: billingPeriod is "${charge.billingPeriod}", not "Month" or "Annual"`,
				);
				return false;
			}
			return true;
		});

	if (candidateCharges.length === 0) {
		logger.log(
			`No eligible charges found after filtering. Initial count: ${initialCharges.length}`,
		);
	}

	assertValidState(
		isNonEmpty(candidateCharges),
		frequencySwitchValidationRequirements.hasEligibleCharges,
		`${candidateCharges.length} charges found`,
	);

	assertValidState(
		candidateCharges.length === 1,
		frequencySwitchValidationRequirements.singleEligibleCharge,
		`${candidateCharges.length} charges found`,
	);

	// candidateCharges is narrowed to a non-empty array by isNonEmpty check above
	const [firstCharge] = candidateCharges;
	return firstCharge;
}

/**
 * Preview a frequency switch for a subscription. Mirrors processFrequencySwitch with preview=true.
 */
export async function previewFrequencySwitch(
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	candidateCharge: { ratePlan: RatePlan; charge: RatePlanCharge },
	productCatalog: ProductCatalog,
	targetBillingPeriod: 'Month' | 'Annual',
	today: dayjs.Dayjs,
): Promise<FrequencySwitchPreviewResponse> {
	const { ratePlan, charge } = candidateCharge;
	const result = await processFrequencySwitch(
		zuoraClient,
		subscription,
		ratePlan,
		charge,
		productCatalog,
		targetBillingPeriod,
		true,
		today,
	);
	return frequencySwitchPreviewResponseSchema.parse(result);
}

/**
 * Execute a frequency switch (non-preview). Mirrors processFrequencySwitch with preview=false.
 */
export async function executeFrequencySwitch(
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	candidateCharge: { ratePlan: RatePlan; charge: RatePlanCharge },
	productCatalog: ProductCatalog,
	targetBillingPeriod: 'Month' | 'Annual',
	today: dayjs.Dayjs,
): Promise<FrequencySwitchResponse> {
	const { ratePlan, charge } = candidateCharge;
	const result = await processFrequencySwitch(
		zuoraClient,
		subscription,
		ratePlan,
		charge,
		productCatalog,
		targetBillingPeriod,
		false,
		today,
	);
	return frequencySwitchResponseSchema.parse(result);
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

	// Use getAllProductDetails to find the target rate plan with proper type checking
	const targetRatePlanDetail = productCatalogHelper
		.getAllProductDetails()
		.find(
			(detail) =>
				detail.zuoraProduct === productDetails.zuoraProduct &&
				detail.productRatePlan === targetRatePlanKey,
		);

	if (!targetRatePlanDetail) {
		throw new Error(
			`Rate plan ${targetRatePlanKey} not found for product ${productDetails.zuoraProduct}`,
		);
	}

	return targetRatePlanDetail.id;
}

async function processFrequencySwitch(
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	currentRatePlan: RatePlan,
	currentCharge: RatePlanCharge,
	productCatalog: ProductCatalog,
	targetBillingPeriod: 'Month' | 'Annual',
	preview: boolean,
	today: dayjs.Dayjs,
): Promise<FrequencySwitchPreviewResponse | FrequencySwitchResponse> {
	const currentBillingPeriod = assertValueIn(
		currentCharge.billingPeriod,
		['Month', 'Annual'] as const,
		'billingPeriod',
	);
	logger.log(
		`${preview ? 'Previewing' : 'Executing'} frequency switch (Orders API) from ${currentBillingPeriod} to ${targetBillingPeriod}`,
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
		const currency: IsoCurrency = currentCharge.currency as IsoCurrency;
		const targetPrice =
			rawTargetRatePlan.pricing?.[currency] ?? currentCharge.price ?? 0;

		// For preview: use today to get Zuora to generate billing docs
		// For execution: use the next non-free payment date (respects promotional periods)
		// This ensures the frequency switch applies after any free periods end
		let effectiveDate: dayjs.Dayjs;
		if (preview) {
			effectiveDate = today;
		} else {
			// Get billing preview to find when the next actual payment will occur
			const billingPreview = await getBillingPreview(
				zuoraClient,
				today.add(13, 'months'), // 13 months gives us minimum 2 payments even on an Annual sub
				subscription.accountNumber,
			);

			const subscriptionItems = toSimpleInvoiceItems(
				itemsForSubscription(subscription.subscriptionNumber)(billingPreview),
			);

			const nextPaymentDate = getNextNonFreePaymentDate(subscriptionItems);
			effectiveDate = dayjs(nextPaymentDate);
		}
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

			logger.log('Orders preview returned successful response', zuoraPreview);

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

			// Calculate current contribution
			const currentContributionAmount = currentRatePlan.ratePlanCharges
				.filter((c) => c.name === 'Contribution' && c.type === 'Recurring')
				.reduce((total, c) => total + (c.price ?? 0), 0);

			// Calculate current discount from all active Percentage discount charges
			const activeDiscountCharges = subscription.ratePlans
				.filter((rp) => rp.lastChangeType !== 'Remove')
				.filter((rp) => rp.productName === 'Discounts')
				.flatMap((rp) => rp.ratePlanCharges)
				.filter((charge) => {
					// Filter to active percentage discounts within the effective period
				return (
					charge.name === 'Percentage' &&
					charge.type === 'Recurring' &&
					charge.effectiveStartDate <= today.toDate() &&
					charge.effectiveEndDate >= today.toDate() &&
						(!charge.chargedThroughDate ||
							charge.chargedThroughDate >= today.toDate())
					);
				});

			// Calculate the total annual discount value considering the duration of each discount
			const currentDiscountAmount = activeDiscountCharges.reduce(
				(total, discountCharge) => {
					const discountPercentage = discountCharge.discountPercentage ?? 0;
					const subscriptionPrice = currentCharge.price ?? 0;

					// Calculate discount per period (month or year)
					const discountPerPeriod = Math.abs(
						subscriptionPrice * (discountPercentage / 100),
					);

					// Calculate how many periods this discount applies for
					const discountStartDate = dayjs(discountCharge.effectiveStartDate);
					const discountEndDate = dayjs(discountCharge.effectiveEndDate);

					let annualizedDiscountValue: number;

					if (currentBillingPeriod === 'Month') {
						// For monthly billing, calculate months and annualize
						const discountMonths = discountEndDate.diff(
							discountStartDate,
							'month',
							true,
						);
						// Annual value = (discount per month) * (number of months discounted)
						annualizedDiscountValue = discountPerPeriod * discountMonths;
					} else {
						// For annual billing, calculate years
						const discountYears = discountEndDate.diff(
							discountStartDate,
							'year',
							true,
						);
						annualizedDiscountValue = discountPerPeriod * discountYears;
					}

					return total + annualizedDiscountValue;
				},
				0,
			);

			return {
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
				currentContribution: {
					amount: currentContributionAmount,
					currency,
					period: currentBillingPeriod === 'Annual' ? 'year' : 'month',
				},
				currentDiscount: {
					amount: Math.round(currentDiscountAmount * 100) / 100,
					currency,
					period: 'year',
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

			return {
				invoiceIds: zuoraResponse.invoiceIds ?? [],
			};
		}
	} catch (error) {
		logger.log(
			`Error during Orders API frequency switch ${preview ? 'preview' : 'execute'}`,
			error,
		);
		// Only return ValidationError messages to clients for security
		if (error instanceof ValidationError) {
			return {
				reasons: [{ message: error.message }],
			};
		}
		// Log unexpected errors but don't expose details to client
		logger.log('Unexpected error type in frequency switch processing', error);
		return {
			reasons: [
				{
					message: 'An unexpected error occurred while processing your request',
				},
			],
		};
	}
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
					parsed.body.targetBillingPeriod,
					today,
				)
			: await executeFrequencySwitch(
					zuoraClient,
					subscription,
					candidateCharge,
					productCatalog,
					parsed.body.targetBillingPeriod,
					today,
				);

		const isErrorResponse =
			frequencySwitchErrorResponseSchema.safeParse(response).success;
		const statusCode = isErrorResponse ? 400 : 200;
		return { statusCode, body: JSON.stringify(response) };
	};
