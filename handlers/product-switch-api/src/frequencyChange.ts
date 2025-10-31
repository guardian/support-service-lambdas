import { prettyPrint } from '@modules/prettyPrint';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getSubscription } from '@modules/zuora/subscription';
import type { RatePlan } from '@modules/zuora/types/objects/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type dayjs from 'dayjs';
import { frequencyChangeResponseSchema } from './schemas';
import type { FrequencyChangeRequestBody } from './schemas';

/**
 * Get the appropriate product rate plan Id for the target billing period
 * Maps billing period to the corresponding rate plan key in the product catalog
 * and retrieves the product rate plan Id for that billing period.
 *
 * @param productCatalogHelper Helper to find product details
 * @param currentRatePlan Current rate plan from the subscription
 * @param targetBillingPeriod Target billing period ('Month' or 'Annual')
 * @returns Product rate plan Id for the target billing period
 * @throws Error if product details cannot be found or target rate plan doesn't exist
 */
function getTargetRatePlanId(
	productCatalogHelper: ProductCatalogHelper,
	currentRatePlan: RatePlan,
	targetBillingPeriod: 'Month' | 'Annual',
): string {
	const productDetails = productCatalogHelper.findProductDetails(
		currentRatePlan.productRatePlanId,
	);
	if (!productDetails) {
		logger.log(
			`Product details not found for product rate plan Id: ${currentRatePlan.productRatePlanId}`,
		);
		throw new Error(
			`Product details not found for product rate plan Id: ${currentRatePlan.productRatePlanId}`,
		);
	}
	logger.log(`Found product details: ${prettyPrint(productDetails)}`);

	// TODO:delete comment - Derive target rate plan key based on requested billing period
	const targetRatePlanKey: 'Monthly' | 'Annual' =
		targetBillingPeriod === 'Month' ? 'Monthly' : 'Annual';
	logger.log(
		`Determined target rate plan key ${targetRatePlanKey} for requested billing period ${targetBillingPeriod}`,
	);

	// TODO:delete comment - Placeholder implementation until catalog logic added
	return '000-000';
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
		const productCatalogHelper = new ProductCatalogHelper(productCatalog);

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

		// TODO: Execute the frequency change OR preview

		const response = {
			success: true,
			mode: parsed.body.preview ? 'preview' : 'execute',
			currentBillingPeriod: charge.billingPeriod,
			targetBillingPeriod: parsed.body.targetBillingPeriod,
		};
		frequencyChangeResponseSchema.parse(response);
		logger.log(
			`Frequency change ${response.mode} response ${prettyPrint(response)}`,
		);
		return { statusCode: 201, body: JSON.stringify(response) };
	};
