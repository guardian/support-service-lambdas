import type { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { sendMessageToQueue } from '@modules/aws/sqs';
import { prettyPrint } from '@modules/prettyPrint';
import type { Stage } from '@modules/stage';

type EmailMessage = {
	To: EmailPayload;
	DataExtensionName: DataExtensionName;
};

export type EmailMessageWithSfContactId = EmailMessage & {
	SfContactId: string;
};

export type EmailMessageWithIdentityUserId = EmailMessage & {
	IdentityUserId: string;
};

export type EmailMessageWithUserId =
	| EmailMessageWithSfContactId
	| EmailMessageWithIdentityUserId;

export type EmailPayload = {
	Address: string; // email address
	ContactAttributes: {
		SubscriberAttributes: Record<string, string>;
	};
};
export const DataExtensionNames = {
	recurringContributionToSupporterPlusSwitch: 'SV_RCtoSP_Switch',
	subscriptionCancelledEmail: 'subscription-cancelled-email',
	updateSupporterPlusAmount: 'payment-amount-changed-email',
	cancellationDiscountConfirmation: 'cancellation-discount-confirmation-email',
	contributionPauseConfirmationEmail: 'contribution-pause-confirmation-email',
	digipackAnnualDiscountConfirmationEmail:
		'digipack-annual-discount-confirmation-email',
	digipackMonthlyDiscountConfirmationEmail:
		'digipack-monthly-discount-confirmation-email',
	supporterPlusAnnualDiscountConfirmationEmail:
		'supporter-plus-annual-discount-confirmation-email',
	discountExpiryNotificationEmail: 'discount-expiry-email',
	stripeDisputeCancellation: 'stripe-dispute-cancellation',
} as const;

export type DataExtensionName =
	(typeof DataExtensionNames)[keyof typeof DataExtensionNames];

export const sendEmail = async (
	stage: Stage,
	emailMessage: EmailMessageWithUserId,
	log: (messsage: string) => void = console.log,
): Promise<SendMessageCommandOutput> => {
	const queueName = `braze-emails-${stage}`;
	log(
		`Sending email message ${prettyPrint(emailMessage)} to queue ${queueName}`,
	);

	const response = await sendMessageToQueue({
		queueName,
		messageBody: JSON.stringify(emailMessage),
	});
	log(`Response from email send was ${prettyPrint(response)}`);
	return response;
};
