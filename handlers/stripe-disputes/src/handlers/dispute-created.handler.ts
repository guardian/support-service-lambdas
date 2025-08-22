import { getIfDefined } from '@modules/nullAndUndefined';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { Logger } from '@modules/logger';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listenDisputeCreatedInputSchema } from '../dtos';
import {
	authenticateWithSalesforce,
	upsertPaymentDisputeInSalesforce,
} from '../services';
import { mapStripeDisputeToSalesforce } from '../mappers';
import type { SalesforceCredentials } from '../types';

export function listenDisputeCreatedHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		logger.log('Processing Stripe dispute created webhook');

		// Parse the Stripe webhook payload
		const stripeWebhook = listenDisputeCreatedInputSchema.parse(
			JSON.parse(getIfDefined(event.body, 'No body was provided')),
		);
		logger.mutableAddContext(stripeWebhook.data.object.id);

		// Get Salesforce credentials from AWS Secrets Manager
		const salesforceCredentials = await getSecretValue<SalesforceCredentials>(
			`${stageFromEnvironment()}/Stripe/Dispute-webhook-secrets/salesforce`,
		);

		logger.log(JSON.stringify(salesforceCredentials, null, 2));
		logger.log('salesforceCredentials.sandbox');
		logger.log(salesforceCredentials.sandbox);
		logger.log('salesforceCredentials.sandbox');

		// Authenticate with Salesforce
		const salesforceAuth = await authenticateWithSalesforce(
			logger,
			salesforceCredentials,
		);

		// Map Stripe dispute data to Salesforce Payment Dispute format
		const paymentDisputeRecord = mapStripeDisputeToSalesforce(stripeWebhook);

		// Upsert the Payment Dispute record in Salesforce using Dispute_ID__c as external ID
		const salesforceResult = await upsertPaymentDisputeInSalesforce(
			salesforceAuth,
			paymentDisputeRecord,
		);

		logger.log(
			`Payment Dispute created in Salesforce with ID: ${salesforceResult.id}`,
		);

		return {
			body: JSON.stringify({
				success: salesforceResult.success,
				salesforceId: salesforceResult.id,
				disputeId: stripeWebhook.data.object.id,
			}),
			statusCode: 200,
		};
	};
}
