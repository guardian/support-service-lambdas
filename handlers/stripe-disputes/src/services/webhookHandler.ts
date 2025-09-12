import { getIfDefined } from '@modules/nullAndUndefined';
import type { Logger } from '@modules/routing/logger';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import AWS from 'aws-sdk';
import {
	listenDisputeClosedInputSchema,
	listenDisputeCreatedInputSchema,
} from '../dtos';
import type {
	ListenDisputeClosedRequestBody,
	ListenDisputeCreatedRequestBody,
} from '../dtos';

const sqs = new AWS.SQS();

/**
 * Creates a webhook handler for Stripe dispute events
 *
 * This handler:
 * 1. Validates the incoming Stripe webhook payload
 * 2. Sends the validated event to SQS for asynchronous processing
 * 3. Returns 200 OK to Stripe immediately
 *
 * @param logger - Logger instance
 * @param eventType - Type of Stripe event ('dispute.created' or 'dispute.closed')
 * @returns Handler function for API Gateway events
 */
export function handleStripeWebhook(
	eventType: 'dispute.created' | 'dispute.closed',
) {
	return async (
		logger: Logger,
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		try {
			logger.log(`Processing Stripe ${eventType} webhook`);

			// Parse and validate webhook payload
			const webhookData = parseWebhookPayload(event, eventType);
			logger.mutableAddContext(webhookData.data.object.id);

			// Send to SQS for asynchronous processing
			await sendToSqs(webhookData, eventType);

			logger.log(`${eventType} webhook successfully queued for processing`);

			// Return 200 OK to Stripe immediately
			return {
				statusCode: 200,
				body: JSON.stringify({
					message: `${eventType} webhook received and queued for processing`,
					disputeId: webhookData.data.object.id,
				}),
			};
		} catch (error) {
			logger.error(`Error processing ${eventType} webhook:`, error);

			// Return 500 to trigger Stripe retry
			return {
				statusCode: 500,
				body: JSON.stringify({
					error: 'Internal server error',
					message: 'Failed to process webhook',
				}),
			};
		}
	};
}

/**
 * Parses and validates the Stripe webhook payload
 */
function parseWebhookPayload(
	event: APIGatewayProxyEvent,
	eventType: 'dispute.created' | 'dispute.closed',
): ListenDisputeCreatedRequestBody | ListenDisputeClosedRequestBody {
	const body = getIfDefined(event.body, 'No body was provided');
	const webhookData: unknown = JSON.parse(body);

	// Validate payload based on event type
	const schema =
		eventType === 'dispute.created'
			? listenDisputeCreatedInputSchema
			: listenDisputeClosedInputSchema;

	const validationResult = schema.safeParse(webhookData);

	if (!validationResult.success) {
		throw new Error(
			`Invalid ${eventType} webhook payload: ${validationResult.error.message}`,
		);
	}

	return validationResult.data;
}

/**
 * Sends the validated webhook data to SQS for asynchronous processing
 */
async function sendToSqs(
	webhookData: ListenDisputeCreatedRequestBody | ListenDisputeClosedRequestBody,
	eventType: 'dispute.created' | 'dispute.closed',
): Promise<void> {
	const queueUrl = process.env.DISPUTE_EVENTS_QUEUE_URL;

	if (!queueUrl) {
		throw new Error('DISPUTE_EVENTS_QUEUE_URL environment variable not set');
	}

	const message = {
		eventType,
		webhookData,
		timestamp: new Date().toISOString(),
		disputeId: webhookData.data.object.id,
	};

	await sqs
		.sendMessage({
			QueueUrl: queueUrl,
			MessageBody: JSON.stringify(message),
			MessageAttributes: {
				eventType: {
					DataType: 'String',
					StringValue: eventType,
				},
				disputeId: {
					DataType: 'String',
					StringValue: webhookData.data.object.id,
				},
			},
		})
		.promise();
}
