import { logger } from '@modules/routing/logger';
import type { DeletionResult } from '../types/deletionMessage';
import { HttpError } from './make-http-request';
import type { BulkDeletionAPI, MParticleClient } from './mparticleClient';

/**
 * mParticle Bulk Profile Deletion API Request Types
 * API Documentation: https://docs.mparticle.com/developers/apis/bulk-profile-deletion-api/
 */
type BulkDeletionRequestItem = {
	environment_type: 'production' | 'development';
	action: 'delete';
	mpid?: string;
	identities?: Record<string, string>;
};
type BulkDeletionRequest = BulkDeletionRequestItem[];

/**
 * mParticle Bulk Profile Deletion API Response Schema
 * The API returns 202 Accepted with no body on success
 * Use a function schema to handle empty responses
 */
const BulkDeletionResponseSchema = (): void => undefined;

type BulkDeletionResponse = void;

/**
 * Delete a user from mParticle using the Bulk Profile Deletion API
 *
 * The API treats 404 responses as successful (idempotent delete).
 * This is important for retry logic when messages are reprocessed from DLQ.
 *
 * @param client - The mParticle Data Subject API client
 * @param userId - The user ID to delete
 * @returns DeletionResult indicating success or failure with retry information
 */
export async function deleteMParticleUser(
	client: MParticleClient<BulkDeletionAPI>,
	userId: string,
	environment: 'production' | 'development' = 'production',
): Promise<DeletionResult> {
	try {
		logger.log(`Attempting to delete user ${userId} from mParticle`);

		const requestBody: BulkDeletionRequest = [
			{
				environment_type: environment,
				action: 'delete',
				identities: {
					customerid: userId,
				},
			},
		];

		const response = await client.post<
			BulkDeletionRequest,
			BulkDeletionResponse
		>('/userprofile/bulkdelete', requestBody, BulkDeletionResponseSchema);

		if (response.success) {
			logger.log(
				`Successfully deleted user ${userId} from mParticle (202 Accepted)`,
			);
			return { success: true };
		} else {
			const error = response.error;

			// Determine if error is retryable
			const retryable = isRetryableError(error);

			logger.error(
				`Failed to delete user ${userId} from mParticle. Retryable: ${retryable}`,
				error,
			);

			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
				retryable,
			};
		}
	} catch (error) {
		// Handle 404 as success - user already deleted (idempotent)
		if (error instanceof HttpError && error.statusCode === 404) {
			logger.log(
				`User ${userId} not found in mParticle (404) - treating as successful deletion`,
			);
			return { success: true };
		}

		logger.error(
			`Unexpected error deleting user ${userId} from mParticle`,
			error,
		);
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
			retryable: true, // Assume unexpected errors are retryable
		};
	}
}

/**
 * Determine if an error is retryable
 * - 4xx errors (except 404) are not retryable (client errors)
 * - 5xx errors are retryable (server errors)
 * - Network errors are retryable
 */
function isRetryableError(error: Error | HttpError): boolean {
	if (error instanceof HttpError) {
		const statusCode = error.statusCode;
		// 404 is handled separately as success
		// 4xx client errors are not retryable
		if (statusCode >= 400 && statusCode < 500) {
			return false;
		}
		// 5xx server errors are retryable
		if (statusCode >= 500) {
			return true;
		}
	}
	// Network errors and other exceptions are retryable
	return true;
}
