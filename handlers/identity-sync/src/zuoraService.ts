import { logger } from '@modules/routing/logger';
import { voidSchema } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';
import type { RatePlanInfo, SubscriptionDetails } from './types';

/**
 * Schema for Zuora rate plan
 */
const zuoraRatePlanSchema = z.object({
	productRatePlanId: z.string(),
	ratePlanName: z.string(),
	lastChangeType: z.string().optional(),
});

/**
 * Schema for Zuora subscription response with rate plans
 */
const zuoraSubscriptionWithRatePlansSchema = z.object({
	subscriptionNumber: z.string(),
	accountId: z.string(),
	status: z.string(),
	termEndDate: z.string(),
	contractEffectiveDate: z.string(),
	ratePlans: z.array(zuoraRatePlanSchema),
});

type ZuoraSubscriptionWithRatePlans = z.infer<typeof zuoraSubscriptionWithRatePlansSchema>;
type ZuoraRatePlan = z.infer<typeof zuoraRatePlanSchema>;

/**
 * Schema for Zuora account response
 */
const zuoraAccountResponseSchema = z.object({
	basicInfo: z.object({
		id: z.string(),
		IdentityId__c: z.string().nullable().optional(),
	}),
});

type ZuoraAccountResponse = z.infer<typeof zuoraAccountResponseSchema>;

/**
 * Updates the IdentityId__c field on a Zuora account
 */
export const updateZuoraAccountIdentityId = async (
	zuoraClient: ZuoraClient,
	accountId: string,
	identityId: string,
): Promise<void> => {
	const path = `/v1/accounts/${accountId}`;
	const payload = {
		IdentityId__c: identityId,
	};
	const body = JSON.stringify(payload);

	logger.log(
		`Updating Zuora account ${accountId} with IdentityId__c: ${identityId}`,
	);

	await zuoraClient.put(path, body, voidSchema);

	logger.log(`Successfully updated Zuora account ${accountId}`);
};

/**
 * Fetches subscription details including rate plans from Zuora
 */
export const getSubscriptionDetails = async (
	zuoraClient: ZuoraClient,
	subscriptionName: string,
): Promise<SubscriptionDetails> => {
	const path = `v1/subscriptions/${subscriptionName}`;

	logger.log(`Fetching subscription details for ${subscriptionName}`);

	const response: ZuoraSubscriptionWithRatePlans = await zuoraClient.get(
		path,
		zuoraSubscriptionWithRatePlansSchema,
	);

	const ratePlans: RatePlanInfo[] = response.ratePlans
		.filter((rp: ZuoraRatePlan) => rp.lastChangeType !== 'RemoveProduct')
		.map((rp: ZuoraRatePlan) => ({
			productRatePlanId: rp.productRatePlanId,
			productRatePlanName: rp.ratePlanName,
		}));

	return {
		subscriptionNumber: response.subscriptionNumber,
		accountId: response.accountId,
		status: response.status,
		termEndDate: response.termEndDate,
		contractEffectiveDate: response.contractEffectiveDate,
		ratePlans,
	};
};

/**
 * Checks if a Zuora account already has an Identity ID set
 */
export const getZuoraAccountIdentityId = async (
	zuoraClient: ZuoraClient,
	accountId: string,
): Promise<string | null> => {
	const path = `v1/accounts/${accountId}`;

	const response: ZuoraAccountResponse = await zuoraClient.get(
		path,
		zuoraAccountResponseSchema,
	);

	return response.basicInfo.IdentityId__c ?? null;
};
