import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getSubscription } from '@modules/zuora/subscription';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';

import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import {
	frequencyChangeResponseSchema,
	type FrequencyChangeRequestBody,
} from './schemas';
import { prettyPrint } from '@modules/prettyPrint';
import type { RatePlan } from '@modules/zuora/types/objects/subscription';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';

/**
 * Get the appropriate product rate plan ID for the target billing period
 * Maps billing period to the corresponding rate plan key in the product catalog
 * and retrieves the product rate plan ID for that billing period.
 *
 * @param productCatalogHelper Helper to access the product catalog
 * @param currentRatePlan Current rate plan from the subscription
 * @param targetBillingPeriod Target billing period ('Month' or 'Annual')
 * @returns Product rate plan ID for the target billing period
 * @throws Error if product details cannot be found or target rate plan doesn't exist
 */
function getAnnualOrMonthlyRatePlanId(
	productCatalogHelper: ProductCatalogHelper,
	currentRatePlan: RatePlan,
	targetBillingPeriod: 'Month' | 'Annual',
): string {
	// Find the product details from the current rate plan's productRatePlanId
	const productDetails = productCatalogHelper.findProductDetails(
		currentRatePlan.productRatePlanId,
	);

	if (!productDetails) {
		throw new Error(
			`Product details not found for rate plan ID: ${currentRatePlan.productRatePlanId}`,
		);
	}

	// Map billing period to rate plan key: 'Month' -> 'Monthly', 'Annual' -> 'Annual'
	const targetRatePlanKey = targetBillingPeriod === 'Month' ? 'Monthly' : 'Annual';

	// Get the target rate plan from the catalog using the product and rate plan key
	const productCatalog = (productCatalogHelper as any).catalogData as ProductCatalog;
	const product = productCatalog[productDetails.zuoraProduct];
	
	if (!product || !product.ratePlans || !(targetRatePlanKey in product.ratePlans)) {
		throw new Error(
			`Target rate plan ${targetRatePlanKey} not found for product ${productDetails.zuoraProduct}`,
		);
	}

	const targetRatePlan = product.ratePlans[targetRatePlanKey as keyof typeof product.ratePlans] as { id: string };
	return targetRatePlan.id;
}

export const frequencyChangeHandler =
	(stage: Stage, today: dayjs.Dayjs) =>
	async (
		_event: unknown,
		parsed: {
			path: { subscriptionNumber: string };
			body: FrequencyChangeRequestBody;
		},
	) => {
		logger.mutableAddContext(parsed.path.subscriptionNumber);
		logger.log(`Frequency change request body ${prettyPrint(parsed.body)}`);
		const todayDate = today.toDate();

		const zuoraClient = await ZuoraClient.create(stage);
		const subscription = await getSubscription(
			zuoraClient,
			parsed.path.subscriptionNumber,
		);
		const productCatalog = await getProductCatalogFromApi(stage);
		const productCatalogHelper = new ProductCatalogHelper(productCatalog);

		logger.log(
			`Subscription rate plans: ${prettyPrint(subscription.ratePlans)}`,
		);
		const candidateCharges = subscription.ratePlans
			// First, filter to active rate plans only
			.filter((rp) => rp.lastChangeType !== 'Remove')
			// Pair each charge with its rate plan for potential future disambiguation (e.g., productName).
			.flatMap((rp) => rp.ratePlanCharges.map((c) => ({ ratePlan: rp, charge: c })))
			// Only recurring charges define ongoing billing periods relevant to frequency changes.
			.filter(({ charge }) => charge.type === 'Recurring')
			// Charge is currently effective.
			.filter(
				({ charge }) =>
					charge.effectiveStartDate <= todayDate && charge.effectiveEndDate >= todayDate,
			)
			// Exclude charges whose chargedThroughDate is before today (fully billed/expired).
			.filter(
				({ charge }) => !charge.chargedThroughDate || charge.chargedThroughDate >= todayDate,
			)
			// Restrict to supported target billing periods.
			.filter(
				({ charge }) => charge.billingPeriod === 'Month' || charge.billingPeriod === 'Annual',
			);
		if (candidateCharges.length === 0) {
			logger.log('No candidate charges found for frequency change.');
			throw new Error(
				'No active recurring charges eligible for frequency change.',
			);
		}
		if (candidateCharges.length > 1) {
			logger.log(
				'Multiple eligible charges found; cannot safely change frequency.',
				candidateCharges,
			);
			throw new Error(
				'Multiple eligible charges found; cannot safely change frequency.',
			);
		}

		const candidateCharge = candidateCharges[0]!;
		const ratePlan = candidateCharge.ratePlan;
		const charge = candidateCharge.charge;

		if (charge.billingPeriod === parsed.body.targetBillingPeriod) {
			logger.log(
				`Charge ${charge.id} already has billing period ${charge.billingPeriod}, no change needed.`,
			);
			return { message: 'Charge already matches target billing period.' };
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
							ProductRatePlanId: getAnnualOrMonthlyRatePlanId(
								productCatalogHelper,
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

		// TODO: Complete the frequency change

		const response = frequencyChangeResponseSchema.parse({} as any);
		logger.log(
			`Frequency change ${response.mode} response ${prettyPrint(response)}`,
		);
		return { statusCode: 200, body: JSON.stringify(response) };
	};
