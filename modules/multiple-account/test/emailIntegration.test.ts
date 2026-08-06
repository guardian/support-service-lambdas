/**
 * @group integration
 */

import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames, sendEmail } from '@modules/email/email';

describe('Email Integration Tests', () => {
	test('Send invitation email', async () => {
		const emailFields: EmailMessageWithUserId = {
			To: {
				// Change this to your email address to test sending a real email
				Address: 'test@thegulocal.com',
				ContactAttributes: {
					SubscriberAttributes: {},
				},
			},
			DataExtensionName:
				DataExtensionNames.multipleAccountsEmails.secondaryUser.invitation,
			IdentityUserId: '12345',
		};

		const response = await sendEmail('CODE', emailFields);
		expect(response.MessageId?.length).toBeGreaterThan(0);
	});
});
