import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const client = new SQSClient({});

export const sendMessageToSqsQueue = async ({
	queueUrl,
	messageBody,
}: {
	queueUrl: string;
	messageBody: string;
}) => {
	console.log('Sending message to SQS queue...');
	console.log(messageBody);
	try {
		const input = {
			QueueUrl: queueUrl,
			MessageBody: messageBody,
		};
		const command = new SendMessageCommand(input);
		const response = await client.send(command);
		console.log(response);
	} catch (error) {
		console.error(error);
		throw error;
	}
};
