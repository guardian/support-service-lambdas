import { logger } from '@modules/routing/logger';
import { SfClient } from '@modules/salesforce/sfClient';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { syncIdentityBatch, syncIdentityForSubscription } from './identitySyncService';
import {
	identitySyncBatchInputSchema,
	type IdentitySyncBatchResult,
	identitySyncInputSchema,
} from './types';

/**
 * Cached clients to avoid cold start overhead on every invocation
 */
let cachedZuoraClient: ZuoraClient | null = null;
let cachedSfClient: SfClient | null = null;

const getZuoraClient = async (stage: Stage): Promise<ZuoraClient> => {
	if (!cachedZuoraClient) {
		logger.log('Initializing Zuora client...');
		cachedZuoraClient = await ZuoraClient.create(stage);
	}
	return cachedZuoraClient;
};

const getSfClient = async (stage: Stage): Promise<SfClient> => {
	if (!cachedSfClient) {
		logger.log('Initializing Salesforce client...');
		cachedSfClient = await SfClient.create(stage);
	}
	return cachedSfClient;
};

/**
 * Lambda handler for Identity ID sync.
 *
 * Supports two modes:
 * 1. Single subscription sync (POST with single IdentitySyncInput)
 * 2. Batch subscription sync (POST with IdentitySyncBatchInput)
 *
 * Query parameters:
 * - dryRun=true: Logs what would be done without making changes
 *
 * Example single request:
 * POST /identity-sync
 * {
 *   "subscriptionId": "2c92a0fd60203d27016043ddc78f17c7",
 *   "subscriptionName": "A-S00248168",
 *   "zuoraAccountId": "2c92a0fd565401c901566c9d29155b17",
 *   "identityId": "123456789",
 *   "sfContactId": "0030J000020wMWpQAM"
 * }
 *
 * Example batch request:
 * POST /identity-sync/batch
 * {
 *   "subscriptions": [...],
 *   "dryRun": false
 * }
 */
export const handler: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (
	event,
) => {
	logger.log(`Received request: ${event.httpMethod} ${event.path}`);
	logger.log(`Body: ${event.body}`);

	const stage = stageFromEnvironment();
	const dryRun = event.queryStringParameters?.dryRun === 'true';

	try {
		const zuoraClient = await getZuoraClient(stage);
		const sfClient = await getSfClient(stage);

		// Determine if this is a batch or single request
		const isBatchRequest = event.path.endsWith('/batch');

		if (!event.body) {
			return errorResponse(400, 'Request body is required');
		}

		const body: unknown = JSON.parse(event.body);

		if (isBatchRequest) {
			// Batch processing
			const parseResult = identitySyncBatchInputSchema.safeParse(body);

			if (!parseResult.success) {
				return errorResponse(400, `Invalid request: ${parseResult.error.message}`);
			}

			const result = await syncIdentityBatch(
				stage,
				zuoraClient,
				sfClient,
				parseResult.data,
			);

			return successResponse(result);
		} else {
			// Single subscription processing
			const parseResult = identitySyncInputSchema.safeParse(body);

			if (!parseResult.success) {
				return errorResponse(400, `Invalid request: ${parseResult.error.message}`);
			}

			const result = await syncIdentityForSubscription(
				stage,
				zuoraClient,
				sfClient,
				parseResult.data,
				dryRun,
			);

			if (result.success) {
				return successResponse(result);
			} else {
				return errorResponse(500, result.error ?? 'Unknown error', result);
			}
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.log(`Handler error: ${errorMessage}`);
		return errorResponse(500, errorMessage);
	}
};

const successResponse = (body: unknown): APIGatewayProxyResult => ({
	statusCode: 200,
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(body, null, 2),
});

const errorResponse = (
	statusCode: number,
	message: string,
	details?: unknown,
): APIGatewayProxyResult => ({
	statusCode,
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ error: message, details }, null, 2),
});

/**
 * CLI entry point for running bulk sync from a JSON file.
 *
 * Usage: pnpm runBulkSync <stage> <input-file.json>
 *
 * The input file should contain an array of IdentitySyncInput objects.
 */
export const runBulkSyncFromFile = async (
	stage: Stage,
	inputFile: string,
	dryRun: boolean = false,
): Promise<IdentitySyncBatchResult> => {
	const fs = await import('fs');
	const content = fs.readFileSync(inputFile, 'utf-8');
	const subscriptions: unknown = JSON.parse(content);

	const parseResult = identitySyncBatchInputSchema.safeParse({
		subscriptions,
		dryRun,
	});

	if (!parseResult.success) {
		throw new Error(`Invalid input file: ${parseResult.error.message}`);
	}

	const zuoraClient = await ZuoraClient.create(stage);
	const sfClient = await SfClient.create(stage);

	return syncIdentityBatch(stage, zuoraClient, sfClient, parseResult.data);
};
