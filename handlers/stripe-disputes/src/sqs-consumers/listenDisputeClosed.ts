import type { Logger } from '@modules/routing/logger';
import type { ListenDisputeClosedRequestBody } from '../dtos';
import { upsertSalesforceObject } from '../services/upsertSalesforceObject';
import type { SalesforceUpsertResponse } from '../types';

/**
 * Handles dispute.closed SQS events
 *
 * This consumer processes dispute closure events that were queued from Stripe webhooks.
 * Currently performs Salesforce upsert, but can be extended with closure-specific logic.
 *
 * @param logger - Logger instance with dispute context
 * @param webhookData - Validated dispute closed webhook payload
 * @param disputeId - Dispute ID for logging context
 * @returns Salesforce upsert response
 */
export async function handleListenDisputeClosed(
	logger: Logger,
	webhookData: ListenDisputeClosedRequestBody,
	disputeId: string,
): Promise<SalesforceUpsertResponse> {
	logger.log(`Processing dispute closure for dispute ${disputeId}`);

	// Current implementation: Salesforce upsert
	// TODO: Add closure-specific logic here in the future (e.g., notifications, cleanup)
	const upsertSalesforceObjectResponse: SalesforceUpsertResponse =
		await upsertSalesforceObject(logger, webhookData);

	logger.log(
		'Salesforce upsert response for dispute closure:',
		JSON.stringify(upsertSalesforceObjectResponse),
	);

	logger.log(`Successfully processed dispute closure for dispute ${disputeId}`);

	return upsertSalesforceObjectResponse;
}
