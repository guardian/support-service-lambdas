import { prettyPrint } from '@modules/prettyPrint';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { singleTriggerDate } from '@modules/zuora/orders/orderActions';
import type { OrderAction } from '@modules/zuora/orders/orderActions';
import { previewOrderRequest } from '@modules/zuora/orders/orderRequests';
import type { PreviewOrderRequest } from '@modules/zuora/orders/orderRequests';
import { getSubscription } from '@modules/zuora/subscription';
import type {
	RatePlan,
	RatePlanCharge,
} from '@modules/zuora/types/objects/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { getCatalogBillingPeriod } from './catalogInformation';
import { frequencyChangeResponseSchema, zuoraPreviewResponseSchema } from './schemas';
import type { ZuoraPreviewResponse } from './schemas';
import type {
	FrequencyChangeRequestBody,
	FrequencyChangeResponse,
} from './schemas';

/**
 * Get the appropriate product rate plan Id for the target billing period
 * Maps billing period to the corresponding rate plan key in the product catalog
 * and retrieves the product rate plan Id for that billing period.
 *
 * @param productCatalog Product catalog to look up rate plans
 * @param currentRatePlan Current rate plan from the subscription (contains productName)
 * @param targetBillingPeriod Target billing period ('Month' or 'Annual')
 * @returns Product rate plan Id for the target billing period
 * @throws Error if product details cannot be found or target rate plan doesn't exist
 */
function getTargetRatePlanId(
	productCatalog: ProductCatalog,
	currentRatePlan: RatePlan,
	targetBillingPeriod: 'Month' | 'Annual',
): string {
	logger.log(
		`Finding target rate plan for product: ${currentRatePlan.productName}`,
	);

	const targetRatePlanKey = getCatalogBillingPeriod(targetBillingPeriod);
	logger.log(
		`Determined target rate plan key '${targetRatePlanKey}' for requested billing period '${targetBillingPeriod}'`,
	);

	// Access catalog directly using the runtime string keys
	// This works because ratePlans is a Record<string, ...>
	const product = productCatalog[
		currentRatePlan.productName as keyof typeof productCatalog
	];

	const ratePlan = product.ratePlans[
		targetRatePlanKey as keyof typeof product.ratePlans
	] as { id: string } | undefined;

	if (!ratePlan) {
		throw new Error(
			`Rate plan ${targetRatePlanKey} not found for product ${currentRatePlan.productName}`,
		);
	}

	return ratePlan.id;
}

/**
 * Preview the billing impact of a frequency change using Zuora Orders preview.
 *
 * Generate an authoritative preview by constructing a ChangePlan order
 * (effective at the subscription term end) and calling `/v1/orders/preview`.
 * This returns invoice detail including tax, discounts, proration (if any) from
 * Zuora itself instead of synthesising a local estimate.
 */
async function previewFrequencyChangeAuthoritative(
	zuoraClient: ZuoraClient,
	subscription: Awaited<ReturnType<typeof getSubscription>>,
	currentRatePlan: RatePlan,
	currentCharge: RatePlanCharge,
	productCatalog: ProductCatalog,
	targetBillingPeriod: 'Month' | 'Annual',
): Promise<FrequencyChangeResponse> {
	const currentBillingPeriod = currentCharge.billingPeriod as 'Month' | 'Annual';
	logger.log(
		`Authoritative preview (Orders API) for frequency change from ${currentBillingPeriod} to ${targetBillingPeriod}`,
	);

	try {
		const targetRatePlanId = getTargetRatePlanId(
			productCatalog,
			currentRatePlan,
			targetBillingPeriod,
		);
		const targetRatePlanKey = getCatalogBillingPeriod(targetBillingPeriod);
		const targetProduct = productCatalog[
			currentRatePlan.productName as keyof typeof productCatalog
		];
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
		const targetPrice = rawTargetRatePlan.pricing?.[currency] ?? currentCharge.price ?? 0;

		// Build ChangePlan order action at term end (when we intend to switch)
		const triggerDates = singleTriggerDate(dayjs(subscription.termEndDate));
		const orderActions: OrderAction[] = [{
			type: 'ChangePlan',
			triggerDates,
			changePlan: {
				productRatePlanId: currentRatePlan.productRatePlanId,
				subType: 'Upgrade',
				newProductRatePlan: {
					productRatePlanId: targetRatePlanId,
					chargeOverrides: [{
						productRatePlanChargeId: targetSubscriptionChargeId,
						pricing: { recurringFlatFee: { listPrice: targetPrice } },
					}],
				},
			},
		}];

		const orderRequest: PreviewOrderRequest = {
			previewOptions: {
				previewThruType: 'SpecificDate',
				previewTypes: ['BillingDocs'],
				specificPreviewThruDate: zuoraDateFormat(dayjs(subscription.termEndDate)),
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

		const zuoraPreview: ZuoraPreviewResponse = await previewOrderRequest(
			zuoraClient,
			orderRequest,
			zuoraPreviewResponseSchema,
		);

		if (!zuoraPreview.success) {
			logger.log('Orders preview returned unsuccessful response', zuoraPreview);
			return {
				success: false,
				mode: 'preview',
				previousBillingPeriod: currentBillingPeriod,
				newBillingPeriod: targetBillingPeriod,
				previewInvoices: [],
				reasons:
					zuoraPreview.reasons?.map((r: { message: string }) => ({ message: r.message })) ?? [
						{ message: 'Unknown error from Zuora preview' },
					],
			};
		}

		return {
			success: true,
			mode: 'preview',
			previousBillingPeriod: currentBillingPeriod,
			newBillingPeriod: targetBillingPeriod,
			previewInvoices: zuoraPreview.previewResult?.invoices ?? [],
		};
	} catch (error) {
		logger.log('Error during Orders API frequency change preview', error);
		return {
			success: false,
			mode: 'preview',
			previousBillingPeriod: currentBillingPeriod,
			newBillingPeriod: targetBillingPeriod,
			previewInvoices: [],
			reasons: [
				{ message: (error instanceof Error ? error.message : 'Unknown error') },
			],
		};
	}
}

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

		const amendmentBody = {
			amendments: [
				{
					Name: `Switch Billing Frequency: Remove ${charge.billingPeriod} plan`,
					Type: 'RemoveProduct',
					ContractEffectiveDate: subscription.termEndDate,
					CustomerAcceptanceDate: subscription.termEndDate,
					ServiceActivationDate: subscription.termEndDate,
					RatePlanId: ratePlan.id,
				},
				{
					Name: `Switch Billing Frequency: Add ${parsed.body.targetBillingPeriod} plan`,
					Type: 'NewProduct',
					ContractEffectiveDate: subscription.termEndDate,
					CustomerAcceptanceDate: subscription.termEndDate,
					ServiceActivationDate: subscription.termEndDate,
					RatePlanData: {
						RatePlan: {
							ProductRatePlanId: getTargetRatePlanId(
								productCatalog,
								ratePlan,
								parsed.body.targetBillingPeriod,
							),
						},
					},
				},
			],
		};
		logger.log(
			`Preparing frequency change from ${charge.billingPeriod} to ${parsed.body.targetBillingPeriod} for charge ${charge.id} in rate plan ${ratePlan.id}`,
			amendmentBody,
		);

		if (parsed.body.preview) {
			const previewResponse = await previewFrequencyChangeAuthoritative(
				zuoraClient,
				subscription,
				ratePlan,
				charge,
				productCatalog,
				parsed.body.targetBillingPeriod,
			);
			logger.log(
				`Frequency change authoritative preview response ${prettyPrint(previewResponse)}`,
			);
			return { statusCode: 200, body: JSON.stringify(previewResponse) };
		}

		const response = {
			success: true,
			mode: 'execute' as const,
			previousBillingPeriod: charge.billingPeriod as 'Month' | 'Annual',
			newBillingPeriod: parsed.body.targetBillingPeriod,
		};
		frequencyChangeResponseSchema.parse(response);
		logger.log(
			`Frequency change ${response.mode} response ${prettyPrint(response)}`,
		);
		return { statusCode: 201, body: JSON.stringify(response) };
	};
