import { DataExtensionNames, sendEmail } from '@modules/email/email';
import { stageFromEnvironment } from '@modules/stage';

export const handler = async (event: {
	subName: string;
	firstName: string;
	paymentAmount: number;
	paymentFrequency: string;
	nextPaymentDate: string;
}) => {
	console.log('event.nextPaymentDate:', event.nextPaymentDate);


	const emailMessageWithUserId = {
		...{
			To: {
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
			},
			// subscriptionCancelledEmail used for testing. will update data extension to active one when published
			DataExtensionName: DataExtensionNames.subscriptionCancelledEmail,
		},
		SfContactId: '0039E00001HiIGlQAN',
	};

	const emailSend = await sendEmail(
		stageFromEnvironment(),
		emailMessageWithUserId,
	);

	console.log('emailSend:', emailSend);

	return emailSend;
};
