import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { awsConfig } from '@modules/aws/config';
import { prettyPrint } from '@modules/prettyPrint';
import type { Stage } from '@modules/stage';

export type EmailPayload = {
	Address: string; // email address
	ContactAttributes: {
		SubscriberAttributes: Record<string, string>;
	};
};

export type DataExtensionName =
	| 'SV_RCtoSP_Switch' // recurring contribution to supporter plus switch
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
	console.log(
		`Sending email message ${prettyPrint(emailMessage)} to queue ${queueName}`,
	);
	const command = new SendMessageCommand({
		QueueUrl: queueName,
		MessageBody: JSON.stringify(emailMessage),
	});

	const response = await client.send(command);
	console.log(`Response from email send was ${prettyPrint(response)}`);
	return response;
};
