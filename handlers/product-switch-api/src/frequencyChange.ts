import { prettyPrint } from '@modules/prettyPrint';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getSubscription } from '@modules/zuora/subscription';
import type {
	RatePlan,
	RatePlanCharge,
} from '@modules/zuora/types/objects/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils/common';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { getCatalogBillingPeriod } from './catalogInformation';
import { frequencyChangeResponseSchema } from './schemas';
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
 * Preview the billing impact of a frequency change using catalog-based pricing.
 * 
 * Unlike the orders API which has `/v1/orders/preview`, 
 * Zuora's amendment API doesn't have a built-in preview mode. 
 * This implementation uses custom logic based on catalog rate plan pricing to
 * calculate what the new billing would be after the frequency change.
 *
 * @param productCatalog Product catalog to look up target pricing
 * @param currentRatePlan Current rate plan from the subscription
 * @param currentCharge Current subscription charge
 * @param subscriptionNumber Subscription number for the preview
 * @param termEndDate When the frequency change will take effect
 * @param targetBillingPeriod Target billing period ('Month' or 'Annual')
 * @returns Preview response with billing information
 */
function previewFrequencyChange(
	productCatalog: ProductCatalog,
	currentRatePlan: RatePlan,
	currentCharge: RatePlanCharge,
	subscriptionNumber: string,
	termEndDate: Date,
	targetBillingPeriod: 'Month' | 'Annual',
): FrequencyChangeResponse {
	const currentBillingPeriod = currentCharge.billingPeriod as 'Month' | 'Annual';
	
	logger.log(
		`Previewing frequency change from ${currentBillingPeriod} to ${targetBillingPeriod}`,
	);

	try {
		// Look up the target rate plan from the catalog
		const targetRatePlanKey = getCatalogBillingPeriod(targetBillingPeriod);
		
		const product = productCatalog[
			currentRatePlan.productName as keyof typeof productCatalog
		];

		const targetRatePlan = product.ratePlans[
			targetRatePlanKey as keyof typeof product.ratePlans
		] as { id: string; pricing?: Record<string, number> } | undefined;

		if (!targetRatePlan) {
			throw new Error(
				`Target rate plan ${targetRatePlanKey} not found for product ${currentRatePlan.productName}`,
			);
		}

		// Get the pricing from the catalog for the currency
		// If pricing is not available in catalog (e.g., for custom pricing), fall back to current price
		const currency = currentCharge.currency;
		let newPrice = currentCharge.price ?? 0;
		
		if (targetRatePlan.pricing && currency in targetRatePlan.pricing) {
			const catalogPrice = targetRatePlan.pricing[currency];
			if (catalogPrice !== undefined) {
				newPrice = catalogPrice;
			}
		}

		// Calculate service dates based on the target billing period
		const serviceStartDate = dayjs(termEndDate);
		const serviceEndDate = serviceStartDate.add(
			1,
			targetBillingPeriod === 'Month' ? 'month' : 'year',
		);

		// Create preview invoice item showing what the new charge would be
		// Note: We're not including tax calculation here as that would require additional API calls
		const invoiceItems = [
			{
				serviceStartDate: zuoraDateFormat(serviceStartDate),
				serviceEndDate: zuoraDateFormat(serviceEndDate),
				amountWithoutTax: newPrice,
				taxAmount: 0, // TODO: Tax calculation would require additional logic
				chargeName: currentCharge.name,
				processingType: 'Charge',
				productName: currentRatePlan.productName,
				productRatePlanChargeId: currentCharge.productRatePlanChargeId,
				unitPrice: newPrice,
				subscriptionNumber,
			},
		];

		const previewInvoices = [
			{
				amount: newPrice,
				amountWithoutTax: newPrice,
				taxAmount: 0,
				targetDate: zuoraDateFormat(serviceStartDate),
				invoiceItems,
			},
		];

		const response: FrequencyChangeResponse = {
			success: true,
			mode: 'preview',
			previousBillingPeriod: currentBillingPeriod,
			newBillingPeriod: targetBillingPeriod,
			previewInvoices,
		};

		return response;
	} catch (error) {
		logger.log('Error creating frequency change preview', error);
		return {
			success: false,
			mode: 'preview',
			previousBillingPeriod: currentBillingPeriod,
			newBillingPeriod: targetBillingPeriod,
			previewInvoices: [],
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
			const previewResponse = previewFrequencyChange(
				productCatalog,
				ratePlan,
				charge,
				subscription.subscriptionNumber,
				subscription.termEndDate,
				parsed.body.targetBillingPeriod,
			);
			logger.log(
				`Frequency change preview response ${prettyPrint(previewResponse)}`,
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
