import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({ region: process.env.region });

export const publishSnsMessage = async ({
	message,
	topicArn,
}: {
	message: string;
	topicArn: string;
}) => {
	try {
		const command = new PublishCommand({
			Message: message,
			TopicArn: topicArn,
		});

		return await snsClient.send(command);
	} catch (error) {
		console.error(error);
		throw error;
	}
};
