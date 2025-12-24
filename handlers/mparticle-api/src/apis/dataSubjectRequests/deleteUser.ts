import { logger } from '@modules/routing/logger';
import type { BrazeClient } from '../../services/brazeClient';
import { deleteBrazeUser } from '../../services/brazeClient';
import type { MParticleClient } from '../../services/mparticleClient';
import { deleteMParticleUser } from '../../services/mparticleDeletion';

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
 * @param userId - The user ID to delete
 * @param mParticleClient - Client for mParticle API
 * @param brazeClient - Client for Braze API
 * @param mParticleEnvironment - The mParticle environment (production or development)
 */
export async function processUserDeletion(
	userId: string,
	mParticleClient: MParticleClient,
	brazeClient: BrazeClient,
	mParticleEnvironment: 'production' | 'development' = 'production',
): Promise<void> {
	logger.log(`Processing deletion for user ${userId}`);

	// Call both APIs - they're idempotent (404 = success)
	const mParticleResult = await deleteMParticleUser(
		mParticleClient,
		userId,
		mParticleEnvironment,
	);
	const brazeResult = await deleteBrazeUser(brazeClient, userId);

	// If mParticle failed with retryable error, throw to trigger SQS retry
	if (!mParticleResult.success) {
		if (mParticleResult.retryable) {
			logger.error(
				`mParticle deletion failed for user ${userId} - will retry`,
				mParticleResult.error,
			);
			throw mParticleResult.error;
		} else {
			logger.error(
				`Non-retryable mParticle error for user ${userId} - giving up`,
				mParticleResult.error,
			);
			// Don't throw - message will be removed from queue
		}
	}

	// If Braze failed with retryable error, throw to trigger SQS retry
	if (!brazeResult.success) {
		if (brazeResult.retryable) {
			logger.error(
				`Braze deletion failed for user ${userId} - will retry`,
				brazeResult.error,
			);
			throw brazeResult.error;
		} else {
			logger.error(
				`Non-retryable Braze error for user ${userId} - giving up`,
				brazeResult.error,
			);
			// Don't throw - message will be removed from queue
		}
	}

	logger.log(`Successfully deleted user ${userId} from all services`);
}
