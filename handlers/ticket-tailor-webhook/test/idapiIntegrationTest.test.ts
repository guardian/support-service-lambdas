/**
 * Fetches the userType from IDAPI for a given email.
 * Asks IDAPI to create a guest account if there is no account associated with that email.
 *
 * @group integration
 */

import { createGuestAccount, fetchUserType } from '../src/idapiService';

test('we are able to fetch the user type for a given user from identity', async () => {
	const userTypeResponse = await fetchUserType(
		'existing.test.user@theguardian.com',
	);
	const userType = userTypeResponse.userType;
	console.log(`usertype is ${userType}`);
	expect(userType).toBe('guest');
	expect(true).toBe(true);
});

//Note: This email address is not cleaned up. Add a new email address when running this test.
test('we are able to create a guest account for a new user', async () => {
	const createGuestAccountResponse = await createGuestAccount(
		'add email for new user here',
	);
	expect(createGuestAccountResponse).toBe(true);
});
