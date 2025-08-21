import { Logger } from '@modules/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import { Router } from '@modules/routing/router';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
	listenDisputeClosedInputSchema,
	listenDisputeCreatedInputSchema,
} from './requestSchema';
import type { SalesforceCredentials } from './services/salesforceAuth';
import { authenticateWithSalesforce } from './services/salesforceAuth';
import { upsertPaymentDisputeInSalesforce } from './services/salesforceCreate';
import { mapStripeDisputeToSalesforce } from './services/stripeToSalesforceMapper';

const stage = process.env.STAGE as Stage;
const logger = new Logger();
const router = new Router([
	{
		httpMethod: 'POST',
		path: '/listen-dispute-created',
		handler: listenDisputeCreatedHandler(logger),
	},
	{
		httpMethod: 'POST',
		path: '/listen-dispute-closed',
		handler: listenDisputeClosedHandler(logger),
	},
]);
export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	logger.log(`Input is ${JSON.stringify(event)}`);
	const response = await router.routeRequest(event);
	logger.log(`Response is ${JSON.stringify(response)}`);
	return response;
};

function listenDisputeCreatedHandler(logger: Logger) {
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

		// Authenticate with Salesforce
		const salesforceAuth = await authenticateWithSalesforce(
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

function listenDisputeClosedHandler(logger: Logger) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		logger.log('listenDisputeClosedHandler');

		// Get Salesforce credentials from AWS Secrets Manager
		const salesforceCredentials = await getSecretValue<SalesforceCredentials>(
			`${stageFromEnvironment()}/Stripe/Dispute-webhook-secrets/salesforce`,
		);
		console.log('Salesforce credentials:', salesforceCredentials);

		const stripeWebhook = listenDisputeClosedInputSchema.parse(
			JSON.parse(getIfDefined(event.body, 'No body was provided')),
		);
		logger.mutableAddContext(stripeWebhook.data.object.id);
		await Promise.resolve();
		return {
			body: JSON.stringify({ ...event, stage }),
			statusCode: 200,
		};
	};
}

// this is a type safe version of stringify
//export const stringify = <T>(t: T, type: ZodType<T>): string =>
//	JSON.stringify(type.parse(t));
