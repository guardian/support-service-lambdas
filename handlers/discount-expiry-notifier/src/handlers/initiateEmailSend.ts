import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { awsConfig } from '@modules/aws/config';
import { DataExtensionNames } from '@modules/email/email';
import type { EmailMessageWithUserId } from '@modules/email/email';
import { prettyPrint } from '@modules/prettyPrint';
import { stageFromEnvironment } from '@modules/stage';
import type { Stage } from '@modules/stage';

export const handler = async (event: {
	firstName: string;
	nextPaymentDate: string;
	paymentAmount: number;
	paymentCurrency: string;
	paymentFrequency: string;
	productName: string;
	sfContactId: string;
	subName: string;
	workEmail: string;
}) => {
	const currencySymbol = getCurrencySymbol(event.paymentCurrency);

	const payload = {
		...{
			To: {
				Address: event.workEmail,
				ContactAttributes: {
					SubscriberAttributes: {
						EmailAddress: event.workEmail,
						paymentAmount: `${currencySymbol}${event.paymentAmount}`,
						first_name: event.firstName,
						date_of_payment: formatDate(event.nextPaymentDate),
						paymentFrequency: event.paymentFrequency,
					},
				},
			},
			// subscriptionCancelledEmail used for testing. will update data extension to active one when published
			DataExtensionName: DataExtensionNames.subscriptionCancelledEmail,
		},
		SfContactId: event.sfContactId,
	};
	try {
		const succeed = event.subName === 'A-S00886188';
		const response = await sendEmail(stageFromEnvironment(), payload, succeed);

		return {
			detail: event,
			emailSendAttempt: {
				status: 'success',
				payload,
				response,
			},
		};
	} catch (error) {
		return {
			detail: event,
			emailSendAttempt: {
				status: 'error',
				payload,
				response: error as string,
			},
		};
	}
};

export const sendEmail = async (
	stage: Stage,
	emailMessage: EmailMessageWithUserId,
	succeed: boolean,
	log: (messsage: string) => void = console.log,
): Promise<SendMessageCommandOutput> => {
	const queueName = succeed
		? `braze-emails-${stage}`
		: `braze-emails-${stage}-blah`;
	const client = new SQSClient(awsConfig);
	log(
		`Sending email message ${prettyPrint(emailMessage)} to queue ${queueName}`,
	);
	const command = new SendMessageCommand({
		QueueUrl: queueName,
		MessageBody: JSON.stringify(emailMessage),
	});

	const response = await client.send(command);
	log(`Response from email send was ${prettyPrint(response)}`);
	return response;
};
function formatDate(inputDate: string): string {
	return new Date(inputDate).toLocaleDateString('en-GB', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});
}

function getCurrencySymbol(currencyCode: string): string {
	const symbols: Record<string, string> = {
		GBP: '£',
		AUD: '$',
		EUR: '€',
		USD: '$',
		CAD: '$',
		NZD: '$',
	};
	return symbols[currencyCode] ?? '';
}
