import { logger } from '@modules/routing/logger';
import type {
	DeletionRequestBody,
	MessageAttributes,
	DeletionStatus,
} from '../../types/deletionMessage';
import { deleteMParticleUser } from '../../services/mparticleDeletion';
import { deleteBrazeUser, BrazeClient } from '../../services/brazeClient';
import type { MParticleClient } from '../../services/mparticleClient';
import { SQSService } from '../../services/sqsService';

/**
 * Process a user deletion request
 *
 * This function implements idempotent deletion logic:
 * 1. Reads message attributes to see which APIs have already succeeded
 * 2. Only calls APIs that haven't succeeded yet
 * 3. Treats 404 responses as success (user already deleted)
 * 4. Updates message attributes based on results
 * 5. If all succeed: returns success
 * 6. If any fail: sends updated message to DLQ for retry
 *
 * @param body - The deletion request containing userId
 * @param attributes - Message attributes tracking deletion status
 * @param mParticleClient - Client for mParticle API
 * @param brazeClient - Client for Braze API
 * @param dlqUrl - URL of the dead letter queue for failed deletions
 * @returns DeletionStatus indicating which APIs succeeded
 */
export async function processUserDeletion(
	body: DeletionRequestBody,
	attributes: MessageAttributes,
	mParticleClient: MParticleClient,
	brazeClient: BrazeClient,
	dlqUrl: string,
): Promise<DeletionStatus> {
	const { userId } = body;
	const attemptCount = attributes.attemptCount + 1;

	logger.log(
		`Processing deletion for user ${userId}, attempt ${attemptCount}. Current status: mParticle=${attributes.mParticleDeleted}, Braze=${attributes.brazeDeleted}`,
	);

	// Track current deletion status
	let mParticleDeleted = attributes.mParticleDeleted;
	let brazeDeleted = attributes.brazeDeleted;

	// Only call mParticle API if not already deleted
	if (!mParticleDeleted) {
		logger.log(`Calling mParticle deletion API for user ${userId}`);
		const mParticleResult = await deleteMParticleUser(mParticleClient, userId);

		if (mParticleResult.success) {
			mParticleDeleted = true;
			logger.log(`mParticle deletion succeeded for user ${userId}`);
		} else {
			logger.error(
				`mParticle deletion failed for user ${userId}. Retryable: ${mParticleResult.retryable}`,
				mParticleResult.error,
			);
		}
	} else {
		logger.log(`Skipping mParticle deletion - already deleted for user ${userId}`);
	}

	// Only call Braze API if not already deleted
	if (!brazeDeleted) {
		logger.log(`Calling Braze deletion API for user ${userId}`);
		const brazeResult = await deleteBrazeUser(brazeClient, userId);

		if (brazeResult.success) {
			brazeDeleted = true;
			logger.log(`Braze deletion succeeded for user ${userId}`);
		} else {
			logger.error(
				`Braze deletion failed for user ${userId}. Retryable: ${brazeResult.retryable}`,
				brazeResult.error,
			);
		}
	} else {
		logger.log(`Skipping Braze deletion - already deleted for user ${userId}`);
	}

	const allSucceeded = mParticleDeleted && brazeDeleted;

	// If not all succeeded, send updated message to DLQ for retry
	if (!allSucceeded) {
		logger.log(
			`Deletion incomplete for user ${userId}. Sending to DLQ with updated attributes.`,
		);

		const updatedAttributes: MessageAttributes = {
			mParticleDeleted,
			brazeDeleted,
			attemptCount,
		};

		const sqsService = new SQSService();
		await sqsService.sendToDLQ(dlqUrl, body, updatedAttributes);

		logger.log(
			`Message sent to DLQ for user ${userId} with attributes:`,
			updatedAttributes,
		);
	} else {
		logger.log(`Successfully deleted user ${userId} from all services`);
	}

	return {
		mParticleDeleted,
		brazeDeleted,
		allSucceeded,
	};
}
