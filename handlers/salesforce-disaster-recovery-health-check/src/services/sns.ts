import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ region: process.env.region });

export const publishSnsMessage = async ({
	topicArn,
	subject,
	message,
}: {
	topicArn: string;
	subject: string;
	message: string;
}) => {
	try {
		const command = new PublishCommand({
			Subject: subject,
			Message: message,
			TopicArn: topicArn,
		});

		return await snsClient.send(command);
	} catch (error) {
		console.error(error);
		throw error;
	}
};
