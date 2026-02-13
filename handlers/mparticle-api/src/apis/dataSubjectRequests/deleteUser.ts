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
 * 4. If either fails: throws to trigger SQS retry
 * 5. After maxReceiveCount retries, message moves to DLQ for investigation
 *
 * Note: The entire Lambda invocation is delayed by 10 seconds via SQS deliveryDelay
 * to allow the Identity system to unsubscribe users from newsletters first.
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
	brazeClient: BrazeClient | undefined,
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
	if (brazeId && brazeId.trim() !== '' && brazeClient) {
		brazeResult = await deleteBrazeUser(brazeClient, brazeId);
	} else {
		logger.log(
			`No brazeId provided for user ${identityId} - skipping Braze deletion`,
		);
	}

	// If mParticle failed, throw to trigger SQS retry
	// After maxReceiveCount retries, message will move to DLQ for investigation
	if (!mParticleResult.success) {
		logger.error(
			`mParticle deletion failed for user ${identityId} - will retry`,
			mParticleResult.error,
		);
		throw mParticleResult.error;
	}

	// If Braze failed, throw to trigger SQS retry
	// After maxReceiveCount retries, message will move to DLQ for investigation
	if (brazeResult && !brazeResult.success) {
		logger.error(
			`Braze deletion failed for user ${identityId} - will retry`,
			brazeResult.error,
		);
		throw brazeResult.error;
	}

	logger.log(
		`Successfully processed deletion for user ${identityId} (Braze ${
			brazeId ? 'processed' : 'skipped - no brazeId'
		})`,
	);
}
