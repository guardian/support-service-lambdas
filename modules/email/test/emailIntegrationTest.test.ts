/**
 * Integration test for the email module.
 *
 * @group integration
 */
import type { EmailMessage } from '@modules/email/email';
import { sendEmail } from '@modules/email/email';

test('Email', async () => {
	// To test an actual email, replace the emailAddress with your email address and the stage with 'PROD'
	// this will send an recurring contribution to supporter plus switch email
	const stage = 'CODE';
	const emailAddress = 'test@thegulocal.com';
	const formatOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	};

	const emailMessage: EmailMessage = {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: 'Support',
					last_name: 'Service Lambdas',
					currency: '£',
					price: '10',
					first_payment_amount: '7',
					date_of_first_payment: new Date().toLocaleDateString(
						'en-UK',
						formatOptions,
					),
					payment_frequency: 'Monthly',
					subscription_id: 'AS-123456',
				},
			},
		},
		DataExtensionName: 'SV_RCtoSP_Switch',
		SfContactId: '0035I00000VUYThQAP',
	};

	const result = await sendEmail(stage, emailMessage);
	expect(result.MessageId?.length).toBeGreaterThan(0);
});
