import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { getIfDefined } from '@modules/nullAndUndefined';
import {
	frequencyChangeResponseSchema,
	type FrequencyChangeRequestBody,
	type FrequencyChangeResponse,
} from './schemas';

const normaliseBillingPeriod = (
	raw?: string,
): 'Month' | 'Annual' | undefined =>
	raw === 'Month' || raw === 'Annual' ? raw : undefined;

const buildBaseResponse = (
	mode: 'preview' | 'execute',
	currentRaw: string,
	target: 'Month' | 'Annual',
): FrequencyChangeResponse => {
	const current = normaliseBillingPeriod(currentRaw);
	if (!current) {
		return {
			success: false,
			mode,
			// default currentBillingPeriod required by schema although unsupported; choose 'Month'
			currentBillingPeriod: 'Month',
			targetBillingPeriod: target,
			reasons: [
				{ message: `Unsupported current billing period '${currentRaw}'` },
			],
		};
	}
	if (current === target) {
		return {
			success: false,
			mode,
			currentBillingPeriod: current,
			targetBillingPeriod: target,
			reasons: [
				{ message: 'Subscription already on requested billing period' },
			],
		};
	}
	return {
		success: true,
		mode,
		currentBillingPeriod: current,
		targetBillingPeriod: target,
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
		logger.log(`Frequency change request body ${JSON.stringify(parsed.body)}`);
		const zuoraClient = await ZuoraClient.create(stage);
		const subscription = await getSubscription(
			zuoraClient,
			parsed.path.subscriptionNumber,
		);
		await getAccount(zuoraClient, subscription.accountNumber);
		const rawBillingPeriod = getIfDefined(
			subscription.ratePlans[0]?.ratePlanCharges[0]?.billingPeriod,
			'Unable to determine current billing period',
		);
		const base = buildBaseResponse(
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
			`Frequency change ${response.mode} response ${JSON.stringify(response)}`,
		);
		// today currently unused in stub; retained for future amendment effective date logic
		void today;
		return { statusCode: 200, body: JSON.stringify(response) };
	};
