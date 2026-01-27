import { logger } from '@modules/routing/logger';
import type { BrazeClient } from '../../services/brazeClient';
import { deleteBrazeUser } from '../../services/brazeClient';
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
 * @param brazeId - Optional Braze ID for the user
 * @param mParticleClient - Client for mParticle API
 * @param brazeClient - Client for Braze API
 * @param mParticleEnvironment - The mParticle environment (production or development)
 */
export async function processUserDeletion(
	identityId: string,
	brazeId: string | undefined,
	mParticleClient: MParticleClient<BulkDeletionAPI>,
	brazeClient: BrazeClient,
	mParticleEnvironment: 'production' | 'development' = 'production',
): Promise<void> {
	logger.log(`Processing deletion for user ${identityId}`);

	// Delete from mParticle using the identity ID (customer_id)
	const mParticleResult = await deleteMParticleUser(
		mParticleClient,
		identityId,
		mParticleEnvironment,
	);

	let brazeResult: DeletionResult | null = null;
	if (brazeId && brazeId.trim() !== '') {
		brazeResult = await deleteBrazeUser(brazeClient, brazeId);
	} else {
		logger.log(
			`No brazeId provided for user ${identityId} - skipping Braze deletion`,
		);
	}

	// If mParticle failed with retryable error, throw to trigger SQS retry
	if (!mParticleResult.success) {
		if (mParticleResult.retryable) {
			logger.error(
				`mParticle deletion failed for user ${identityId} - will retry`,
				mParticleResult.error,
			);
			throw mParticleResult.error;
		} else {
			logger.error(
				`Non-retryable mParticle error for user ${identityId} - giving up`,
				mParticleResult.error,
			);
			// Don't throw - message will be removed from queue
		}
	}

	// If Braze failed with retryable error, throw to trigger SQS retry
	if (brazeResult && !brazeResult.success) {
		if (brazeResult.retryable) {
			logger.error(
				`Braze deletion failed for user ${identityId} - will retry`,
				brazeResult.error,
			);
			throw brazeResult.error;
		} else {
			logger.error(
				`Non-retryable Braze error for user ${identityId} - giving up`,
				brazeResult.error,
			);
			// Don't throw - message will be removed from queue
		}
	}

	logger.log(
		`Successfully processed deletion for user ${identityId} (Braze ${
			brazeId ? 'processed' : 'skipped - no brazeId'
		})`,
	);
}
