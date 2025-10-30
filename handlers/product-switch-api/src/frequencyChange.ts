import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { getIfDefined } from '@modules/nullAndUndefined';
import {
	frequencyChangeResponseSchema,
	type FrequencyChangeRequestBody,
	type FrequencyChangeResponse,
} from './schemas';
import { prettyPrint } from '@modules/prettyPrint';

/**
 * Raw billing period string from Zuora charge (can include other values e.g. Quarter) – we filter.
 * @param raw Value to normalize
 * @returns Normalized billing period or undefined
 */
const normalizeBillingPeriod = (
	raw?: string,
): 'Month' | 'Annual' | undefined =>
	raw === 'Month' || raw === 'Annual' ? raw : undefined;

const performChange = (
	mode: 'preview' | 'execute',
	currentRawBillingPeriod: string,
	targetBillingPeriod: 'Month' | 'Annual',
): FrequencyChangeResponse => {
	const currentBillingPeriod = normalizeBillingPeriod(currentRawBillingPeriod);

	if (!currentBillingPeriod) {
		return {
			success: false,
			mode,
			currentBillingPeriod: 'Month', // Fallback since schema demands a value;
			targetBillingPeriod: targetBillingPeriod,
			reasons: [
				{
					message: `Unsupported current billing period '${currentRawBillingPeriod}'`,
				},
			],
		};
	}

	if (currentBillingPeriod === targetBillingPeriod) {
		return {
			success: false, // No-op: already on requested billing period.
			mode,
			currentBillingPeriod: currentBillingPeriod,
			targetBillingPeriod: targetBillingPeriod,
			reasons: [
				{ message: 'Subscription already on requested billing period' },
			],
		};
	}

	// TODO: Implement actual preview and execute logic with Zuora API calls.

	return {
		success: true,
		mode,
		currentBillingPeriod: currentBillingPeriod,
		targetBillingPeriod: targetBillingPeriod,
	};
};

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

		const zuoraClient = await ZuoraClient.create(stage);
		const subscription = await getSubscription(
			zuoraClient,
			parsed.path.subscriptionNumber,
		);

		const todayDate = today.toDate();
		const candidateCharges = subscription.ratePlans
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
		// Simple disambiguation: if multiple, prefer one without discountPercentage; else first.
		const preferred =
			candidateCharges.find(({ c }) => !c.discountPercentage) ||
			candidateCharges[0];
		const rawBillingPeriod = getIfDefined(
			preferred?.c.billingPeriod || undefined,
			'Unable to determine current billing period',
		);

		const base = performChange(
			parsed.body.preview ? 'preview' : 'execute',
			rawBillingPeriod,
			parsed.body.targetBillingPeriod,
		);
		const enriched: FrequencyChangeResponse =
			base.mode === 'preview'
				? {
						...base,
						previewInvoices: base.success ? [] : undefined,
					}
				: { ...base, invoiceIds: base.success ? [] : undefined };

		const response = frequencyChangeResponseSchema.parse(enriched);
		logger.log(
			`Frequency change ${response.mode} response ${prettyPrint(response)}`,
		);
		return { statusCode: 200, body: JSON.stringify(response) };
	};
