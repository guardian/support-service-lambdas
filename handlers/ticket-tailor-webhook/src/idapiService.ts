import { Stage } from '@modules/stage';
import { getIdApiSecret } from './getSecrets';

export type UserTypeResponse = {
	userType: string;
};

const stage = process.env.STAGE as Stage;

const idapiToken = getIdApiSecret(stage);
const idapiUrl =
	stage === 'PROD'
		? 'https://idapi.theguardian.com'
		: 'https://idapi.code.dev-theguardian.com';

const userTypeEndpoint = `/user/type/`;
const guestEndpoint = '/guest?accountVerificationEmail=true';

export const fetchUserType = async (email: string) => {
	const token = await idapiToken;
	const bearerToken = `Bearer ${token.token}`;

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
		return response.json() as Promise<UserTypeResponse>;
	});

	return userTypeResponse;
};

export const createGuestAccount = async (email: string) => {
	const token = await idapiToken;
	const bearerToken = `Bearer ${token.token}`;

	return await fetch(idapiUrl.concat(guestEndpoint), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-GU-ID-Client-Access-Token': bearerToken,
			Origin: 'https://theguardian.com',
		},
        body: JSON.stringify({ primaryEmailAddress: email }),
	}).then((response) => {
		if (!response.ok) {
			throw new Error(response.statusText);
		}
		console.log(response);
		return true;
	});
};
