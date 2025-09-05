import type { Logger } from '@modules/logger';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type {
	ListenDisputeClosedRequestBody,
	ListenDisputeCreatedRequestBody,
} from '../dtos';
import type {
	PaymentDisputeRecord,
	ZuoraInvoiceFromStripeChargeIdResult,
} from '../interfaces';
import { mapStripeDisputeToSalesforce } from '../mappers';
import type {
	SalesforceAuthResponse,
	SalesforceCredentials,
	SalesforceUpsertResponse,
} from '../types';
import { authenticateWithSalesforce } from './salesforceAuth';
import { upsertPaymentDisputeInSalesforce } from './salesforceCreate';

/**
 * Upserts a Payment Dispute record in Salesforce with optional Zuora enrichment data
 *
 * This is the main orchestration function that:
 * 1. Retrieves Salesforce credentials from AWS Secrets Manager
 * 2. Authenticates with Salesforce using OAuth client credentials flow
 * 3. Maps Stripe webhook data (with optional Zuora data) to Salesforce format
 * 4. Performs the upsert operation using the dispute ID as external ID
 *
 * @param logger - Logger instance for tracking operations
 * @param dataFromStripe - Stripe webhook payload (created or closed dispute)
 * @param zuoraData - Optional Zuora data to enrich the Salesforce record
 * @returns Promise containing the Salesforce upsert response
 * @throws {Error} When authentication with Salesforce fails
 * @throws {Error} When the upsert operation fails
 */
export const upsertSalesforceObject = async (
	logger: Logger,
	dataFromStripe:
		| ListenDisputeCreatedRequestBody
		| ListenDisputeClosedRequestBody,
	zuoraData?: ZuoraInvoiceFromStripeChargeIdResult,
): Promise<SalesforceUpsertResponse> => {
	logger.log('Starting upsertSalesforceObject process');

	const salesforceCredentials = await getSecretValue<SalesforceCredentials>(
		`${stageFromEnvironment()}/Salesforce/ConnectedApp/StripeDisputeWebhooks`,
	);

	// Authenticate with Salesforce
	const salesforceAuth: SalesforceAuthResponse =
		await authenticateWithSalesforce(logger, salesforceCredentials);

	// Map Stripe dispute data to Salesforce Payment Dispute format
	const paymentDisputeRecord: PaymentDisputeRecord =
		mapStripeDisputeToSalesforce(dataFromStripe, zuoraData);

	logger.log(
		'Mapped Payment Dispute record:',
		JSON.stringify(paymentDisputeRecord),
	);

	// Upsert the Payment Dispute record in Salesforce using Dispute_ID__c as external ID
	return upsertPaymentDisputeInSalesforce(
		salesforceAuth,
		paymentDisputeRecord,
		logger,
	);
};
