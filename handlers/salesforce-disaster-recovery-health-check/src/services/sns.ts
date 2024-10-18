import {
	PublishCommand,
	type PublishCommandInput,
	SNSClient,
} from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ region: process.env.region });

export const publishSnsMessage = async ({
	topicArn,
	subject = '',
	message,
	messageAttributes = {},
}: {
	topicArn: string;
	subject?: string;
	message: string;
	messageAttributes?: PublishCommandInput['MessageAttributes'];
}) => {
	try {
		const command = new PublishCommand({
			Subject: subject,
			Message: message,
			TopicArn: topicArn,
			MessageAttributes: messageAttributes,
		});

		return await snsClient.send(command);
	} catch (error) {
		console.error(error);
		throw error;
	}
};
