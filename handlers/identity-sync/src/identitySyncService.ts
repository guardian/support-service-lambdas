import { logger } from '@modules/routing/logger';
import type { SfClient } from '@modules/salesforce/sfClient';
import type { Stage } from '@modules/stage';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	isValidSalesforceContactId,
	updateSalesforceContactIdentityId,
} from './salesforceService';
import { syncSubscriptionToSupporterProductData } from './supporterProductDataService';
import type {
	IdentitySyncBatchInput,
	IdentitySyncBatchResult,
	IdentitySyncInput,
	IdentitySyncResult,
} from './types';
import {
	getSubscriptionDetails,
	updateZuoraAccountIdentityId,
} from './zuoraService';

/**
 * Syncs Identity ID for a single subscription.
 *
 * This performs the following steps:
 * 1. Update Zuora Account with IdentityId__c
 * 2. Update Salesforce Contact with IdentityID__c (if sfContactId provided)
 * 3. Sync subscription data to SupporterProductData DynamoDB via SQS
 */
export const syncIdentityForSubscription = async (
	stage: Stage,
	zuoraClient: ZuoraClient,
	sfClient: SfClient | null,
	input: IdentitySyncInput,
	dryRun: boolean = false,
): Promise<IdentitySyncResult> => {
	const { subscriptionName, zuoraAccountId, identityId, sfContactId } = input;

	const result: IdentitySyncResult = {
		subscriptionName,
		identityId,
		success: false,
		zuoraUpdated: false,
		salesforceUpdated: false,
		supporterProductDataSynced: false,
	};

	try {
		logger.log(
			`${dryRun ? '[DRY RUN] ' : ''}Starting Identity sync for subscription ${subscriptionName}`,
		);
		logger.log(`  - Zuora Account ID: ${zuoraAccountId}`);
		logger.log(`  - Identity ID: ${identityId}`);
		logger.log(`  - SF Contact ID: ${sfContactId ?? 'not provided'}`);

		// Step 1: Update Zuora Account
		if (dryRun) {
			logger.log(
				`[DRY RUN] Would update Zuora account ${zuoraAccountId} with IdentityId__c: ${identityId}`,
			);
		} else {
			await updateZuoraAccountIdentityId(zuoraClient, zuoraAccountId, identityId);
		}
		result.zuoraUpdated = true;

		// Step 2: Update Salesforce Contact (if provided)
		if (sfContactId && sfClient) {
			if (!isValidSalesforceContactId(sfContactId)) {
				logger.log(
					`Warning: Invalid Salesforce Contact ID format: ${sfContactId}, skipping SF update`,
				);
			} else if (dryRun) {
				logger.log(
					`[DRY RUN] Would update Salesforce Contact ${sfContactId} with IdentityID__c: ${identityId}`,
				);
				result.salesforceUpdated = true;
			} else {
				await updateSalesforceContactIdentityId(sfClient, sfContactId, identityId);
				result.salesforceUpdated = true;
			}
		} else {
			logger.log(
				`No Salesforce Contact ID provided, skipping SF update for ${subscriptionName}`,
			);
		}

		// Step 3: Sync to SupporterProductData
		const subscriptionDetails = await getSubscriptionDetails(
			zuoraClient,
			subscriptionName,
		);

		if (dryRun) {
			logger.log(
				`[DRY RUN] Would sync ${subscriptionDetails.ratePlans.length} rate plan(s) to SupporterProductData`,
			);
			result.supporterProductDataSynced = true;
		} else {
			const syncedCount = await syncSubscriptionToSupporterProductData(
				stage,
				identityId,
				subscriptionDetails,
			);
			result.supporterProductDataSynced = syncedCount > 0;
		}

		result.success = true;
		logger.log(
			`${dryRun ? '[DRY RUN] ' : ''}Successfully completed Identity sync for ${subscriptionName}`,
		);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		result.error = errorMessage;
		logger.log(`Failed to sync Identity for ${subscriptionName}: ${errorMessage}`);
	}

	return result;
};

/**
 * Syncs Identity ID for a batch of subscriptions.
 *
 * Processes subscriptions sequentially to avoid overwhelming APIs.
 * Consider adding rate limiting or parallel processing with concurrency limits
 * for large batches.
 */
export const syncIdentityBatch = async (
	stage: Stage,
	zuoraClient: ZuoraClient,
	sfClient: SfClient | null,
	batchInput: IdentitySyncBatchInput,
): Promise<IdentitySyncBatchResult> => {
	const { subscriptions, dryRun } = batchInput;

	logger.log(
		`${dryRun ? '[DRY RUN] ' : ''}Starting batch Identity sync for ${subscriptions.length} subscription(s)`,
	);

	const results: IdentitySyncResult[] = [];
	let successful = 0;
	let failed = 0;

	for (const subscription of subscriptions) {
		const result = await syncIdentityForSubscription(
			stage,
			zuoraClient,
			sfClient,
			subscription,
			dryRun,
		);

		results.push(result);

		if (result.success) {
			successful++;
		} else {
			failed++;
		}

		// Add a small delay between requests to avoid rate limiting
		if (!dryRun && subscriptions.length > 1) {
			await delay(100);
		}
	}

	const batchResult: IdentitySyncBatchResult = {
		totalProcessed: subscriptions.length,
		successful,
		failed,
		results,
		dryRun,
	};

	logger.log(
		`${dryRun ? '[DRY RUN] ' : ''}Batch Identity sync completed: ${successful} successful, ${failed} failed`,
	);

	return batchResult;
};

const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));
