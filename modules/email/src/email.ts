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
	supporterPlusFrequencySwitchConfirmation:
		'SV_MonthlyToAnnualSwitchConfirmation',
	day0Emails: {
		// Day 0 thank you emails, sent by support-workers
		supporterPlus: 'supporter-plus', // SV_SP_WelcomeDay0
		recurringContribution: 'regular-contribution-thank-you', // SV_RC_WelcomeDay0
		digitalSubscription: 'digipack', // SV_DP_WelcomeDay0v2 (PROD), SV_DP_WelcomeDay0 (CODE)
		guardianAdLite: 'guardian-ad-lite', // SV_CorP_WelcomeDay0
		guardianWeekly: 'guardian-weekly', // SV_GW_WelcomeDay0
		homeDelivery: 'paper-delivery', // SV_HD_WelcomeDay0
		homeDeliveryObserver: 'sunday-paper-delivery', // SV_HD_ObserverWelcomeDay0
		subscriptionCard: 'paper-subscription-card', // SV_SC_WelcomeDay0
		subscriptionCardObserver: 'sunday-paper-subscription-card', // SV_SC_ObserverWelcomeDay0
		nationalDelivery: 'paper-national-delivery', // SV_ND_WelcomeDay0
		tierThree: 'tier-three', // SV_T3_WelcomeDay0
	},
	failedCheckoutEmails: {
		// Failed checkout emails, sent by support-workers
		supporterPlus: 'supporter-plus-failed',
		recurringContribution: 'contribution-failed',
		digitalSubscription: 'digipack-failed',
		guardianAdLite: 'guardian-ad-lite-failed',
		guardianWeekly: 'guardian-weekly-failed',
		paper: 'paper-failed',
		tierThree: 'tier-three-failed',
	},
} as const;

// This type allows to get types from the nested DataExtensionNames objects eg.
// const a: DataExtensionName = 'day0Emails.guardianWeekly';
type RecursiveKeys<T> = T extends object
	? {
			[K in keyof T & string]: T[K] extends object
				? `${K}.${RecursiveKeys<T[K]>}`
				: K;
		}[keyof T & string]
	: never;

export type DataExtensionName = RecursiveKeys<typeof DataExtensionNames>;

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
