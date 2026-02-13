import { logger } from '@modules/routing/logger';
import { z } from 'zod';
import type { DeletionResult } from '../types/deletionMessage';
import {
	HttpError,
	type HttpResponse,
	RestRequestMaker,
} from './make-http-request';

/**
 * Braze User Delete API Request
 * API Documentation: https://www.braze.com/docs/api/endpoints/user_data/post_user_delete/
 *
 * IMPORTANT - Naming clarification to avoid confusion:
 *
 * The brazeId field from the SQS message contains Guardian's external identifier for
 * the user in Braze. This identifier has different names depending on the context:
 *
 * - In the SQS message: called "brazeId"
 * - In Guardian datalake: called "External ID"
 * - In Braze terminology: called "User ID"
 * - In Braze API request: goes in the "external_ids" field
 *
 * This is NOT Braze's internal-only identifier (which Braze calls "Braze ID" and would
 * be sent in the "braze_ids" field). That internal ID is only used within Braze's system.
 *
 * Historical context: Originally the Identity service sent only the Identity ID in the
 * SNS message, and we had to look up the external ID from another service. This caused
 * issues when users were already deleted. The Identity team changed it so the SNS message
 * now includes the external ID directly (as the "brazeId" field), allowing us to delete
 * from Braze even if the user is gone from other systems.
 */
type BrazeDeleteRequest = {
	external_ids: string[];
};

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

	constructor(apiUrl: string, apiKey: string) {
		/**
		 * Braze uses API key authentication via Authorization header
		 * https://www.braze.com/docs/api/basics/#rest-api-key
		 */
		this.rest = new RestRequestMaker(
			apiUrl,
			{
				Authorization: `Bearer ${apiKey}`,
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

		const fullUrl = `${this.rest.baseURL}/users/delete`;
		logger.log(
			`Braze DELETE request - URL: ${fullUrl}, userId: ${userId}, body: ${JSON.stringify(requestBody)}`,
		);

		try {
			return await this.rest.makeRESTRequest(logger.getCallerInfo(1))(
				'POST',
				'/users/delete',
				BrazeDeleteResponseSchema,
				requestBody,
			);
		} catch (error) {
			// Catch HttpError thrown by rawHttpRequest when response is not ok
			if (error instanceof HttpError) {
				return { success: false, error };
			}
			throw error;
		}
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
			// Braze may return deleted=0 for non-existent users - treat as idempotent success
			const deletedCount = response.data.deleted ?? 1;
			if (deletedCount === 0) {
				logger.log(
					`User ${userId} not found in Braze (deleted=0) - treating as successful deletion`,
				);
			} else {
				logger.log(
					`Successfully deleted user ${userId} from Braze. Deleted count: ${deletedCount}`,
				);
			}
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
		// Handle 404 as success - user already deleted (idempotent)
		if (error instanceof HttpError && error.statusCode === 404) {
			logger.log(
				`User ${userId} not found in Braze (404) - treating as successful deletion`,
			);
			return { success: true };
		}

		logger.error(`Unexpected error deleting user ${userId} from Braze`, error);
		return {
			success: false,
			error: error instanceof Error ? error : new Error(String(error)),
			retryable: true, // Assume unexpected errors are retryable
		};
	}
}

function isRetryableError(error: Error | HttpError): boolean {
	if (error instanceof HttpError) {
		const statusCode = error.statusCode;
		// 5xx server errors are retryable
		if (statusCode >= 500) {
			return true;
		}
		// 4xx client errors are not retryable
		if (statusCode >= 400 && statusCode < 500) {
			return false;
		}
	}
	// Network errors and other exceptions are retryable
	return true;
}
