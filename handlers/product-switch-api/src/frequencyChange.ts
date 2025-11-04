import { prettyPrint } from '@modules/prettyPrint';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
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
import { getCatalogBillingPeriod } from './catalogInformation';
import {
	frequencyChangeResponseSchema,
	zuoraPreviewResponseSchema,
	zuoraSwitchResponseSchema,
} from './schemas';
import type { ZuoraPreviewResponse, ZuoraSwitchResponse } from './schemas';
import type {
	FrequencyChangeRequestBody,
	FrequencyChangeResponse,
} from './schemas';

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

	const targetRatePlanKey = getCatalogBillingPeriod(targetBillingPeriod);
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
): Promise<FrequencyChangeResponse> {
	const currentBillingPeriod = currentCharge.billingPeriod as
		| 'Month'
		| 'Annual';
	const mode = preview ? 'preview' : 'execute';
	logger.log(
		`${preview ? 'Previewing' : 'Executing'} frequency change (Orders API) from ${currentBillingPeriod} to ${targetBillingPeriod}`,
	);

	try {
		const targetRatePlanId = getTargetRatePlanId(
			productCatalog,
			currentRatePlan,
			targetBillingPeriod,
		);
		const targetRatePlanKey = getCatalogBillingPeriod(targetBillingPeriod);

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
		// For execution: use term end date to schedule the change correctly
		const effectiveDate = preview ? dayjs() : dayjs(subscription.termEndDate);
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
					success: false,
					mode: 'preview',
					previousBillingPeriod: currentBillingPeriod,
					newBillingPeriod: targetBillingPeriod,
					previewInvoices: [],
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

			return {
				success: true,
				mode: 'preview',
				previousBillingPeriod: currentBillingPeriod,
				newBillingPeriod: targetBillingPeriod,
				previewInvoices: cleanedInvoices,
			};
		} else {
			const orderRequest: CreateOrderRequest = {
				processingOptions: {
					runBilling: true,
					collectPayment: false,
				},
				orderDate: zuoraDateFormat(dayjs(subscription.termEndDate)),
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
					success: false,
					mode: 'execute',
					previousBillingPeriod: currentBillingPeriod,
					newBillingPeriod: targetBillingPeriod,
					reasons: zuoraResponse.reasons?.map((r: { message: string }) => ({
						message: r.message,
					})) ?? [{ message: 'Unknown error from Zuora execution' }],
				};
			}

			return {
				success: true,
				mode: 'execute',
				previousBillingPeriod: currentBillingPeriod,
				newBillingPeriod: targetBillingPeriod,
				invoiceIds: zuoraResponse.invoiceIds,
			};
		}
	} catch (error) {
		logger.log(`Error during Orders API frequency change ${mode}`, error);
		return {
			success: false,
			mode,
			previousBillingPeriod: currentBillingPeriod,
			newBillingPeriod: targetBillingPeriod,
			reasons: [
				{ message: error instanceof Error ? error.message : 'Unknown error' },
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
		_event: unknown,
		parsed: {
			path: { subscriptionNumber: string };
			body: FrequencyChangeRequestBody;
		},
	): Promise<{ statusCode: number; body: string }> => {
		logger.mutableAddContext(parsed.path.subscriptionNumber);
		logger.log(`Frequency change request body ${prettyPrint(parsed.body)}`);
		const todayDate = today.toDate();

		const zuoraClient = await ZuoraClient.create(stage);
		const subscription = await getSubscription(
			zuoraClient,
			parsed.path.subscriptionNumber,
		);
		const productCatalog = await getProductCatalogFromApi(stage);

		logger.log(
			`Subscription rate plans: ${prettyPrint(subscription.ratePlans)}`,
		);
		const candidateCharges = subscription.ratePlans
			// First, filter to active rate plans only
			.filter((rp) => rp.lastChangeType !== 'Remove')
			// Pair each charge with its rate plan for potential future disambiguation (e.g., productName).
			.flatMap((rp) =>
				rp.ratePlanCharges.map((c) => ({ ratePlan: rp, charge: c })),
			)
			// Only Subscription rate plans charges
			.filter(({ charge }) => charge.name === 'Subscription')
			// Only recurring charges define ongoing billing periods relevant to frequency changes.
			.filter(({ charge }) => charge.type === 'Recurring')
			// Charge is currently effective.
			.filter(
				({ charge }) =>
					charge.effectiveStartDate <= todayDate &&
					charge.effectiveEndDate >= todayDate,
			)
			// Exclude charges whose chargedThroughDate is before today (fully billed/expired).
			.filter(
				({ charge }) =>
					!charge.chargedThroughDate || charge.chargedThroughDate >= todayDate,
			)
			// Restrict to supported target billing periods.
			.filter(
				({ charge }) =>
					charge.billingPeriod === 'Month' || charge.billingPeriod === 'Annual',
			);
		if (candidateCharges.length === 0) {
			logger.log('No candidate charges found for frequency change.');
			return {
				statusCode: 400,
				body: JSON.stringify({
					message: 'No active recurring charges eligible for frequency change.',
				}),
			};
		}
		if (candidateCharges.length > 1) {
			logger.log(
				'Multiple eligible charges found; cannot safely change frequency.',
				candidateCharges,
			);
			return {
				statusCode: 400,
				body: JSON.stringify({
					message:
						'Multiple eligible charges found; cannot safely change frequency.',
				}),
			};
		}

		const candidateCharge = candidateCharges[0]!;
		const ratePlan = candidateCharge.ratePlan;
		const charge = candidateCharge.charge;

		if (charge.billingPeriod === parsed.body.targetBillingPeriod) {
			logger.log(
				`Charge ${charge.id} already has billing period ${charge.billingPeriod}, no change needed.`,
			);
			return {
				statusCode: 205,
				body: JSON.stringify({
					message: 'Charge already matches target billing period.',
				}),
			};
		}

		// Process the frequency change using Orders API (preview or execute)
		const response = await processFrequencyChange(
			zuoraClient,
			subscription,
			ratePlan,
			charge,
			productCatalog,
			parsed.body.targetBillingPeriod,
			parsed.body.preview,
		);

		frequencyChangeResponseSchema.parse(response);
		logger.log(
			`Frequency change ${response.mode} response ${prettyPrint(response)}`,
		);

		const statusCode = response.success
			? parsed.body.preview
				? 200
				: 201
			: 400;
		return { statusCode, body: JSON.stringify(response) };
	};
