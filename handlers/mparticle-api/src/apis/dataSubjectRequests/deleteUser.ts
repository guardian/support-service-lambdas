import { logger } from '@modules/routing/logger';
import type { BrazeClient } from '../../services/brazeClient';
import { deleteBrazeUser } from '../../services/brazeClient';
import type { IdentityApiClient } from '../../services/identityApiClient';
import type {
	BulkDeletionAPI,
	MParticleClient,
} from '../../services/mparticleClient';
import { deleteMParticleUser } from '../../services/mparticleDeletion';
import type { DeletionResult } from '../../types/deletionMessage';

/**
 * Process a user deletion request
 *
 * This function implements idempotent deletion logic:
 * 1. Calls both mParticle and Braze deletion APIs
 * 2. Treats 404 responses as success (user already deleted - idempotent)
 * 3. If both succeed: message removed from queue
 * 4. If either fails with retryable error: throws to trigger SQS retry
 * 5. SQS automatically retries up to maxReceiveCount, then moves to DLQ
 *
 * @param identityId - The identity ID (customerId) to delete
 * @param mParticleClient - Client for mParticle API
 * @param brazeClient - Client for Braze API
 * @param mParticleEnvironment - The mParticle environment (production or development)
 */
export async function processUserDeletion(
	identityId: string,
	mParticleClient: MParticleClient<BulkDeletionAPI>,
	brazeClient: BrazeClient,
	identityApiClient: IdentityApiClient,
	mParticleEnvironment: 'production' | 'development' = 'production',
): Promise<void> {
	logger.log(`Processing deletion for user ${identityId}`);

	const identityUser = await identityApiClient.getUser(identityId);
	if (!identityUser) {
		const error = new Error(
			`Unable to fetch Identity API data for user ${identityId}`,
		);
		logger.error(error.message, error);
		throw error;
	}

	const { identityId: resolvedIdentityId, brazeUuid } = identityUser;

	// Delete from mParticle using the identity ID (customer_id)
	const mParticleResult = await deleteMParticleUser(
		mParticleClient,
		resolvedIdentityId,
		mParticleEnvironment,
	);

	let brazeResult: DeletionResult | null = null;
	if (brazeUuid) {
		brazeResult = await deleteBrazeUser(brazeClient, brazeUuid);
	} else {
		logger.log(
			`Identity API did not return a brazeUuid for user ${resolvedIdentityId} - skipping Braze deletion`,
		);
	}

	// If mParticle failed with retryable error, throw to trigger SQS retry
	if (!mParticleResult.success) {
		if (mParticleResult.retryable) {
			logger.error(
				`mParticle deletion failed for user ${resolvedIdentityId} - will retry`,
				mParticleResult.error,
			);
			throw mParticleResult.error;
		} else {
			logger.error(
				`Non-retryable mParticle error for user ${resolvedIdentityId} - giving up`,
				mParticleResult.error,
			);
			// Don't throw - message will be removed from queue
		}
	}

	// If Braze failed with retryable error, throw to trigger SQS retry
	if (brazeResult && !brazeResult.success) {
		if (brazeResult.retryable) {
			logger.error(
				`Braze deletion failed for user ${resolvedIdentityId} - will retry`,
				brazeResult.error,
			);
			throw brazeResult.error;
		} else {
			logger.error(
				`Non-retryable Braze error for user ${resolvedIdentityId} - giving up`,
				brazeResult.error,
			);
			// Don't throw - message will be removed from queue
		}
	}

	logger.log(
		`Successfully processed deletion for user ${resolvedIdentityId} (Braze ${
			brazeUuid ? 'processed' : 'skipped - no brazeUuid'
		})`,
	);
}
