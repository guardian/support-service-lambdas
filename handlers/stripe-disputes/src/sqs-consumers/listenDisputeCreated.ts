import type { Logger } from '@modules/logger';
import type { ListenDisputeCreatedRequestBody } from '../dtos';
import { upsertSalesforceObject } from '../services/upsertSalesforceObject';
import type { SalesforceUpsertResponse } from '../types';

/**
 * Handles dispute.created SQS events
 *
 * This consumer processes dispute creation events that were queued from Stripe webhooks.
 * Currently performs Salesforce upsert, but can be extended with creation-specific logic.
 *
 * @param logger - Logger instance with dispute context
 * @param webhookData - Validated dispute created webhook payload
 * @param disputeId - Dispute ID for logging context
 * @returns Salesforce upsert response
 */
export async function handleListenDisputeCreated(
	logger: Logger,
	webhookData: ListenDisputeCreatedRequestBody,
	disputeId: string,
): Promise<SalesforceUpsertResponse> {
	logger.log(`Processing dispute creation for dispute ${disputeId}`);

	// Current implementation: Salesforce upsert
	// TODO: Add creation-specific logic here in the future
	const upsertSalesforceObjectResponse: SalesforceUpsertResponse =
		await upsertSalesforceObject(logger, webhookData);

	logger.log(
		'Salesforce upsert response for dispute creation:',
		JSON.stringify(upsertSalesforceObjectResponse),
	);

	logger.log(
		`Successfully processed dispute creation for dispute ${disputeId}`,
	);

	return upsertSalesforceObjectResponse;
}
