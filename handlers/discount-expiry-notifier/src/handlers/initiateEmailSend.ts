import type {
	EmailMessage,
	EmailMessageWithSfContactId,
	EmailMessageWithUserId,
	EmailPayload,
} from '@modules/email/email';
import { DataExtensionNames, sendEmail } from '@modules/email/email';
import { stageFromEnvironment } from '@modules/stage';

export const handler = () => {
	const emailPayload: EmailPayload = {
		Address: 'david.pepper@guardian.co.uk',
		ContactAttributes: {
			SubscriberAttributes: {
				EmailAddress: 'david.pepper@guardian.co.uk',
				paymentAmount: '70.00',
				first_name: 'David',
				date_of_payment: '28 February 2025',
				paymentFrequency: 'month',
			},
		},
	};
	console.log('emailPayload:', emailPayload);

	const emailMessage: EmailMessage = {
		To: emailPayload,
		DataExtensionName: DataExtensionNames.subscriptionCancelledEmail,
	};
	console.log('emailMessage:', emailMessage);

	const emailMessageWithSfContactId: EmailMessageWithSfContactId = {
		...emailMessage,
		SfContactId: 'someSfContactIdValue',
	};
	const emailMessageWithUserId: EmailMessageWithUserId =
		emailMessageWithSfContactId;

	const emailSend = sendEmail(stageFromEnvironment(), emailMessageWithUserId);

	console.log('emailSend:', emailSend);
};
