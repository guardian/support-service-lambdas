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

export function handleStripeWebhook(
	logger: Logger,
	eventType: 'dispute.created' | 'dispute.closed',
) {
	return async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		try {
			logger.log(`Processing Stripe ${eventType} webhook`);

			const webhookData = parseWebhookPayload(event, eventType);
			logger.mutableAddContext(webhookData.data.object.id);

			await sendToSqs(webhookData, eventType);

			logger.log(`${eventType} webhook successfully queued for processing`);

			return {
				statusCode: 200,
				body: JSON.stringify({
					message: `${eventType} webhook received and queued for processing`,
					disputeId: webhookData.data.object.id,
				}),
			};
		} catch (error) {
			logger.error(`Error processing ${eventType} webhook:`, error);

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

function parseWebhookPayload(
	event: APIGatewayProxyEvent,
	eventType: 'dispute.created' | 'dispute.closed',
): ListenDisputeCreatedRequestBody | ListenDisputeClosedRequestBody {
	const body = getIfDefined(event.body, 'No body was provided');
	const webhookData: unknown = JSON.parse(body);

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
