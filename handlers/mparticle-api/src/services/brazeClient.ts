import { logger } from '@modules/routing/logger';
import type { DeletionResult } from '../types/deletionMessage';
import { RestRequestMaker, HttpError, type HttpResponse } from './make-http-request';
import { z } from 'zod';

/**
 * Braze User Delete API Request Schema
 * API Documentation: https://www.braze.com/docs/api/endpoints/user_data/post_user_delete/
 */
const BrazeDeleteRequestSchema = z.object({
	external_ids: z.array(z.string()),
});

type BrazeDeleteRequest = z.infer<typeof BrazeDeleteRequestSchema>;

/**
 * Braze API Response Schema
 */
const BrazeDeleteResponseSchema = z.object({
	deleted: z.number().optional(),
	message: z.string().optional(),
});

type BrazeDeleteResponse = z.infer<typeof BrazeDeleteResponseSchema>;

/**
 * Braze API Client for user deletion
 */
export class BrazeClient {
	private readonly rest: RestRequestMaker;

	constructor(
		private readonly apiUrl: string,
		private readonly apiKey: string,
	) {
		/**
		 * Braze uses API key authentication via Authorization header
		 * https://www.braze.com/docs/api/basics/#rest-api-key
		 */
		this.rest = new RestRequestMaker(
			apiUrl,
			{
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			fetch,
		);
	}

	/**
	 * Delete a user from Braze
	 * Endpoint: POST /users/delete
	 */
	async deleteUser(userId: string): Promise<HttpResponse<BrazeDeleteResponse>> {
		const requestBody: BrazeDeleteRequest = {
			external_ids: [userId],
		};

		return await this.rest.makeRESTRequest(logger.getCallerInfo(1))(
			'POST',
			'/users/delete',
			BrazeDeleteResponseSchema,
			requestBody,
		);
	}
}

/**
 * Delete a user from Braze
 *
 * The API treats 404 responses as successful (idempotent delete).
 * This is important for retry logic when messages are reprocessed from DLQ.
 *
 * @param client - The Braze client
 * @param userId - The user ID to delete
 * @returns DeletionResult indicating success or failure with retry information
 */
export async function deleteBrazeUser(
	client: BrazeClient,
	userId: string,
): Promise<DeletionResult> {
	try {
		logger.log(`Attempting to delete user ${userId} from Braze`);

		const response = await client.deleteUser(userId);

		if (response.success) {
			logger.log(
				`Successfully deleted user ${userId} from Braze. Deleted count: ${response.data.deleted}`,
			);
			return { success: true };
		} else {
			const error = response.error;

			// Handle 404 as success - user already deleted (idempotent)
			if (error instanceof HttpError && error.statusCode === 404) {
				logger.log(
					`User ${userId} not found in Braze (404) - treating as successful deletion`,
				);
				return { success: true };
			}

			// Braze may also return success=true with deleted=0 for non-existent users
			// This is also idempotent success
			if (
				error instanceof HttpError &&
				error.statusCode === 200 &&
				typeof error.body === 'object' &&
				error.body !== null &&
				'deleted' in error.body &&
				error.body.deleted === 0
			) {
				logger.log(
					`User ${userId} not found in Braze (deleted=0) - treating as successful deletion`,
				);
				return { success: true };
			}

			// Determine if error is retryable
			const retryable = isRetryableError(error);

			logger.error(
				`Failed to delete user ${userId} from Braze. Retryable: ${retryable}`,
				error,
			);

			return {
				success: false,
				error: error instanceof Error ? error : new Error(String(error)),
				retryable,
			};
		}
	} catch (error) {
		logger.error(`Unexpected error deleting user ${userId} from Braze`, error);
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
