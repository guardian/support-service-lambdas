import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';

export type EmailPayload = {
	Address: string; // email address
	ContactAttributes: {
		SubscriberAttributes: Record<string, string>;
	};
};

export type DataExtensionName =
	| 'SV_RCtoSP_Switch'
	| 'subscription-cancelled-email';

export type EmailMessage = {
	To: EmailPayload;
	DataExtensionName: DataExtensionName;
	SfContactId: string;
	IdentityUserId?: string;
};

export const sendEmail = async (
	stage: Stage,
	emailMessage: EmailMessage,
): Promise<SendMessageCommandOutput> => {
	const queueName = `braze-emails-${stage}`;
	const client = new SQSClient(awsConfig);

	const command = new SendMessageCommand({
		QueueUrl: queueName,
		MessageBody: JSON.stringify(emailMessage),
	});

	const response = await client.send(command);
	console.log(response);
	return response;
};
