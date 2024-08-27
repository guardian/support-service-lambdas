import type { Stage } from '@modules/stage';
import { getIdApiSecret } from './getSecrets';

export type UserTypeResponse = {
	userType: string;
};

const stage = process.env.STAGE as Stage;


const idapiUrl =
	stage === 'PROD'
		? 'https://idapi.theguardian.com'
		: 'https://idapi.code.dev-theguardian.com';

const userTypeEndpoint = `/user/type/`;
const guestEndpoint = '/guest?accountVerificationEmail=true';

export const fetchUserType = async (email: string) => {
	const idapiSecret = await getIdApiSecret(stage);
	const bearerToken = `Bearer ${idapiSecret.token}`;

	const userTypeResponse = await fetch(
		idapiUrl.concat(userTypeEndpoint).concat(email),
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-GU-ID-Client-Access-Token': bearerToken,
			},
		},
	).then((response) => {
		if (!response.ok) {
			throw new Error(response.statusText);
		}
		console.log(`User type response is ${response.type}`);
		return response.json() as Promise<UserTypeResponse>;
	});

	return userTypeResponse;
};

export const createGuestAccount = async (email: string) => {
	const idapiSecret = await getIdApiSecret(stage);
	const bearerToken = `Bearer ${idapiSecret.token}`;

	return await fetch(idapiUrl.concat(guestEndpoint), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-GU-ID-Client-Access-Token': bearerToken,
			Origin: 'https://theguardian.com',
		},
		body: JSON.stringify({ primaryEmailAddress: email }),
	}).then((response) => {
		console.log(`Create Guest Account response status: ${response.statusText}`);
		if (!response.ok) {
			throw new Error(response.statusText);
		}
		console.log(response);
		return true;
	});
};
