/**
 * @group integration
 */

import { sendInvitationEmail } from '../src/multipleAccountEmails';

describe('Email Integration Tests', () => {
	test('Send invitation email', async () => {
		await sendInvitationEmail(
			'CODE',
			'12345',
			// To send a real email, change this to your email address
			'test@thegulocal.com',
			'John',
			'john@thegulocal.com',
			'INVITE123',
		);
	});
});
