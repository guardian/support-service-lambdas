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
import { logger } from '@modules/routing/logger';
import { awsConfig } from '@modules/aws/config';

const defaultClient = new SQSClient(awsConfig);

export const sendMessageToQueue = async ({
	queueName,
	messageBody,
	send,
}: {
	queueName: string;
	messageBody: SendMessageCommandInput['MessageBody'];
	send?: typeof SQSClient.prototype.send;
}) => {
	try {
		const { QueueUrl } = await (send ?? defaultClient.send.bind(defaultClient))(
			new GetQueueUrlCommand({ QueueName: queueName }),
		);

		if (!QueueUrl) {
			throw new Error('Queue URL not found');
		}

		const command = new SendMessageCommand({
			QueueUrl,
			MessageBody: messageBody,
		});
		const response = await (send ?? defaultClient.send.bind(defaultClient))(
			command,
		);
		return response;
	} catch (error) {
		logger.log('Error sending message to SQS: ' + queueName, error);
		throw error;
	}
};

export const sendBatchMessagesToQueue = async ({
	queueName,
	messages,
	send,
}: {
	queueName: string;
	messages: Array<{ id: string; body: string }>;
	send?: typeof SQSClient.prototype.send;
}) => {
	try {
		const { QueueUrl } = await (send ?? defaultClient.send.bind(defaultClient))(
			new GetQueueUrlCommand({ QueueName: queueName }),
		);
		if (!QueueUrl) {
			throw new Error('Queue URL not found');
		}

		const entries: SendMessageBatchRequestEntry[] = messages.map((msg) => ({
			Id: msg.id,
			MessageBody: msg.body,
		}));

		const command = new SendMessageBatchCommand({
			QueueUrl,
			Entries: entries,
		});
		return await (send ?? defaultClient.send.bind(defaultClient))(command);
	} catch (error) {
		logger.log('Error sending batch to SQS', { queueName, error });
		throw error;
	}
};
