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

/**
 * Get the appropriate product rate plan ID for the target billing period
 * @param rp Rate plan object containing both annual and monthly product rate plan IDs
 * @param targetBillingPeriod Target billing period
 * @returns Product rate plan ID for the target billing period
 */
function getAnnualOrMonthlyRatePlanId(
	rp: any,
	targetBillingPeriod: 'Month' | 'Annual',
) {
	if (targetBillingPeriod === 'Annual') return rp.annualProductRatePlanId;
	return rp.monthlyProductRatePlanId;
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
			.flatMap((rp) => rp.ratePlanCharges.map((c) => ({ rp, c })))
			// Only recurring charges define ongoing billing periods relevant to frequency changes.
			.filter(({ c }) => c.type === 'Recurring')
			// Charge is currently effective.
			.filter(
				({ c }) =>
					c.effectiveStartDate <= todayDate && c.effectiveEndDate >= todayDate,
			)
			// Exclude charges whose chargedThroughDate is before today (fully billed/expired).
			.filter(
				({ c }) => !c.chargedThroughDate || c.chargedThroughDate >= todayDate,
			)
			// Restrict to supported target billing periods.
			.filter(
				({ c }) => c.billingPeriod === 'Month' || c.billingPeriod === 'Annual',
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

		const { rp, c } = candidateCharges[0];

		if (c.billingPeriod === parsed.body.targetBillingPeriod) {
			logger.log(
				`Charge ${c.id} already has billing period ${c.billingPeriod}, no change needed.`,
			);
			return { message: 'Charge already matches target billing period.' };
		}

		const amendmentBody = {
			amendments: [
				{
					Name: `Switch Billing Frequency: Remove ${c.billingPeriod} plan`,
					Type: 'RemoveProduct',
					ContractEffectiveDate: rp.termEndDate || todayDate,
					CustomerAcceptanceDate: rp.termEndDate || todayDate,
					ServiceActivationDate: rp.termEndDate || todayDate,
					RatePlanId: rp.ratePlanId,
				},
				{
					Name: `Switch Billing Frequency: Add ${parsed.body.targetBillingPeriod} plan`,
					Type: 'NewProduct',
					ContractEffectiveDate: rp.termEndDate || todayDate,
					CustomerAcceptanceDate: rp.termEndDate || todayDate,
					ServiceActivationDate: rp.termEndDate || todayDate,
					RatePlanData: {
						RatePlan: {
							ProductRatePlanId: getAnnualOrMonthlyRatePlanId(
								rp,
								parsed.body.targetBillingPeriod,
							),
						},
					},
				},
			],
		};
		logger.log(
			`Preparing frequency change from ${c.billingPeriod} to ${parsed.body.targetBillingPeriod} for charge ${c.id} in rate plan ${rp.id}`,
			amendmentBody,
		);

		// TODO: Complete the frequency change

		const response = frequencyChangeResponseSchema.parse({} as any);
		logger.log(
			`Frequency change ${response.mode} response ${prettyPrint(response)}`,
		);
		return { statusCode: 200, body: JSON.stringify(response) };
	};
