import { z } from 'zod';

/**
 * Input schema for a single subscription that needs Identity ID sync.
 * This data typically comes from a BigQuery export or API Gateway request.
 */
export const identitySyncInputSchema = z.object({
	/** Zuora subscription ID (e.g., "2c92a0fd60203d27016043ddc78f17c7") */
	subscriptionId: z.string(),

	/** Zuora subscription number/name (e.g., "A-S00248168") */
	subscriptionName: z.string(),

	/** Zuora account ID that owns the subscription */
	zuoraAccountId: z.string(),

	/** The Identity ID (Okta legacy_identity_id) to be synced */
	identityId: z.string(),

	/** Salesforce Contact ID (optional - if provided, SF will be updated) */
	sfContactId: z.string().optional(),

	/** Salesforce Account ID (CRM ID) */
	sfAccountId: z.string().optional(),

	/** Email address (for logging/verification purposes) */
	email: z.string().email().optional(),
});

export type IdentitySyncInput = z.infer<typeof identitySyncInputSchema>;

/**
 * Batch input for processing multiple subscriptions
 */
export const identitySyncBatchInputSchema = z.object({
	subscriptions: z.array(identitySyncInputSchema),
	dryRun: z.boolean().default(false),
});

export type IdentitySyncBatchInput = z.infer<typeof identitySyncBatchInputSchema>;

/**
 * Result of syncing a single subscription
 */
export type IdentitySyncResult = {
	subscriptionName: string;
	identityId: string;
	success: boolean;
	zuoraUpdated: boolean;
	salesforceUpdated: boolean;
	supporterProductDataSynced: boolean;
	error?: string;
};

/**
 * Batch result containing all individual results
 */
export type IdentitySyncBatchResult = {
	totalProcessed: number;
	successful: number;
	failed: number;
	results: IdentitySyncResult[];
	dryRun: boolean;
};

/**
 * Rate plan info needed for SupporterProductData sync
 */
export type RatePlanInfo = {
	productRatePlanId: string;
	productRatePlanName: string;
};

/**
 * Subscription details fetched from Zuora
 */
export type SubscriptionDetails = {
	subscriptionNumber: string;
	accountId: string;
	status: string;
	termEndDate: string;
	contractEffectiveDate: string;
	ratePlans: RatePlanInfo[];
};
