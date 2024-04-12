/**
 * Integration test for the email module.
 *
 * @group integration
 */
import dayjs from 'dayjs';
import type { EmailMessage } from '@modules/email/email';
import { sendEmail } from '@modules/email/email';

test('Email', async () => {
	const emailMessage: EmailMessage = {
		To: {
			Address: 'rupert.bates@theguardian.com',
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: 'Support',
					last_name: 'Service Lambdas',
					currency: '£',
					price: '10',
					first_payment_amount: '7',
					date_of_first_payment: dayjs().format('DD MMMM YYYY'),
					payment_frequency: 'Monthly',
					subscription_id: 'AS-123456',
				},
			},
		},
		DataExtensionName: 'SV_RCtoSP_Switch',
		SfContactId: '0035I00000VUYThQAP',
	};

	const result = await sendEmail('PROD', emailMessage);
	expect(result.MessageId?.length).toBeGreaterThan(0);
});
