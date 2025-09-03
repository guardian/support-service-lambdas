import type { Logger } from '@modules/logger';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { ListenDisputeCreatedRequestBody } from '../dtos';
import type { PaymentDisputeRecord } from '../interfaces';
import { mapStripeDisputeToSalesforce } from '../mappers';
import type {
	SalesforceAuthResponse,
	SalesforceCredentials,
	SalesforceUpsertResponse,
} from '../types';
import { authenticateWithSalesforce } from './salesforceAuth';
import { upsertPaymentDisputeInSalesforce } from './salesforceCreate';

export const upsertSalesforceObject = async (
	logger: Logger,
	dataFromStripe: ListenDisputeCreatedRequestBody,
): Promise<SalesforceUpsertResponse> => {
	const salesforceCredentials = await getSecretValue<SalesforceCredentials>(
		`${stageFromEnvironment()}/Salesforce/ConnectedApp/StripeDisputeWebhooks`,
	);

	// Authenticate with Salesforce
	const salesforceAuth: SalesforceAuthResponse =
		await authenticateWithSalesforce(logger, salesforceCredentials);

	// Map Stripe dispute data to Salesforce Payment Dispute format
	const paymentDisputeRecord: PaymentDisputeRecord =
		mapStripeDisputeToSalesforce(dataFromStripe);

	// Upsert the Payment Dispute record in Salesforce using Dispute_ID__c as external ID
	return upsertPaymentDisputeInSalesforce(salesforceAuth, paymentDisputeRecord);
};
