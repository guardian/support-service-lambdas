import type { SendMessageCommandInput } from '@aws-sdk/client-sqs';
import {
	SQSClient,
	GetQueueUrlCommand,
	SendMessageCommand,
} from '@aws-sdk/client-sqs';
import { awsConfig } from '@modules/aws/config';

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
