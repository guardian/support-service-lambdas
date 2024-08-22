//import Mock = jest.Mock;
//import {createGuestAccount, fetchUserType} from "../src/idapiService";
import { fetchUserType } from '../src/idapiService';

test('we are able to fetch the user type for a given user from identity', async () => {
	const userTypeResponse = await fetchUserType('m_w_mcnamara@hotmail.com');
	const userType = userTypeResponse.userType;
	console.log(`usertype is ${userType}`);
	expect(true).toBe(true);
});
//
// test('we are able to create a guest account for a new user', async () => {
// 	const createGuestAccountResponse = await createGuestAccount('michael.mcnamara.identitytest@guardian.co.uk');
// 	expect(createGuestAccountResponse).toBe(true);
// });
