import type { Logger } from '@modules/logger';
import type { ListenDisputeCreatedRequestBody } from '../dtos';
import { upsertSalesforceObject } from '../services/upsertSalesforceObject';
import type { SalesforceUpsertResponse } from '../types';

export async function handleListenDisputeCreated(
	logger: Logger,
	webhookData: ListenDisputeCreatedRequestBody,
	disputeId: string,
): Promise<SalesforceUpsertResponse> {
	logger.log(`Processing dispute creation for dispute ${disputeId}`);

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
