/**
 * @group integration
 */

import { sendInvitationEmail } from '../src/multipleAccountEmails';

describe('Email Integration Tests', () => {
	test('Send invitation email', async () => {
		await sendInvitationEmail(
			'CODE',
			// To send a real email, change this to your identity id
			'12345',
			// and this to your email address
			'test@thegulocal.com',
			'John',
			'john@thegulocal.com',
			'INVITE123',
		);
	});
});
