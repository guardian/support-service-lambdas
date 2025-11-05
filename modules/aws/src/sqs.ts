import type {
	SendMessageBatchRequestEntry,
	SendMessageCommandInput,
} from '@aws-sdk/client-sqs';
import {
	GetQueueUrlCommand,
	SendMessageBatchCommand,
	SendMessageCommand,
	SQSClient,
} from '@aws-sdk/client-sqs';
import { awsConfig } from '@modules/aws/config';
import { logger } from '@modules/routing/logger';

const client = new SQSClient(awsConfig);

export const sendMessageToQueue = async ({
	queueName,
	messageBody,
}: {
	queueName: string;
	messageBody: SendMessageCommandInput['MessageBody'];
}) => {
	try {
		const { QueueUrl } = await client.send(
			new GetQueueUrlCommand({ QueueName: queueName }),
		);

		if (!QueueUrl) throw new Error('Queue URL not found');

		const command = new SendMessageCommand({
			QueueUrl,
			MessageBody: messageBody,
		});
		const response = await client.send(command);
		return response;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const sendBatchMessagesToQueue = async ({
	queueName,
	messages,
}: {
	queueName: string;
	messages: Array<{ id: string; body: string }>;
}) => {
	try {
		const { QueueUrl } = await client.send(
			new GetQueueUrlCommand({ QueueName: queueName }),
		);
		if (!QueueUrl) throw new Error('Queue URL not found');

		const entries: SendMessageBatchRequestEntry[] = messages.map((msg) => ({
			Id: msg.id,
			MessageBody: msg.body,
		}));

		const command = new SendMessageBatchCommand({
			QueueUrl,
			Entries: entries,
		});
		return await client.send(command);
	} catch (error) {
		logger.log('Error sending batch to SQS', { queueName, error });
		throw error;
	}
};
