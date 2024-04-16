import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { awsConfig } from '@modules/aws/config';
import { prettyPrint } from '@modules/prettyPrint';
import type { Stage } from '@modules/stage';

type Either<T, Keys extends keyof T = keyof T> = Pick<
	T,
	Exclude<keyof T, Keys>
> &
	{
		[K in Keys]-?: Required<Pick<T, K>> &
			Partial<Record<Exclude<Keys, K>, undefined>>;
	}[Keys];

// The EmailMessageWithUserId type ensures that the message has either a SfContactId or an IdentityUserId
export type EmailMessageWithUserId = Either<
	EmailMessage,
	'SfContactId' | 'IdentityUserId'
>;

export type EmailMessage = {
	To: EmailPayload;
	DataExtensionName: DataExtensionName;
	SfContactId?: string;
	IdentityUserId?: string;
};

export type EmailPayload = {
	Address: string; // email address
	ContactAttributes: {
		SubscriberAttributes: Record<string, string>;
	};
};
export const DataExtensionNames = {
	recurringContributionToSupporterPlusSwitch: 'SV_RCtoSP_Switch',
	subscriptionCancelledEmail: 'subscription-cancelled-email',
} as const;

export type DataExtensionName =
	(typeof DataExtensionNames)[keyof typeof DataExtensionNames];

export const sendEmail = async (
	stage: Stage,
	emailMessage: EmailMessageWithUserId,
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
