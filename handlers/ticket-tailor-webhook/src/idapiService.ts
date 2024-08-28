import { getSecretValue } from '@modules/secrets-manager/src/getSecret';
import { stageFromEnvironment } from '@modules/stage';

export type IdApiToken = {
	token: string;
};

export type UserTypeResponse = {
	userType: string;
};

const stage = stageFromEnvironment();

const idapiUrl =
	stage === 'PROD'
		? 'https://idapi.theguardian.com'
		: 'https://idapi.code.dev-theguardian.com';

const userTypeEndpoint = `/user/type/`;
const guestEndpoint = '/guest?accountVerificationEmail=true';

export const fetchUserType = async (
	email: string,
): Promise<UserTypeResponse> => {
	const idapiSecret = await getSecretValue<IdApiToken>(
		`${stage}/TicketTailor/IdApi-token`,
	);
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
	);
	if (!userTypeResponse.ok) {
		throw new Error(userTypeResponse.statusText);
	}
	console.log(`User type response is ${userTypeResponse.type}`);
	return (await userTypeResponse.json()) as UserTypeResponse;
};

export const createGuestAccount = async (email: string) => {
	const idapiSecret = await getSecretValue<IdApiToken>(
		`${stage}/TicketTailor/IdApi-token`,
	);
	const bearerToken = `Bearer ${idapiSecret.token}`;
	const response = await fetch(idapiUrl.concat(guestEndpoint), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-GU-ID-Client-Access-Token': bearerToken,
			Origin: 'https://theguardian.com',
		},
		body: JSON.stringify({ primaryEmailAddress: email }),
	});
	console.log(`Create Guest Account response status: ${response.statusText}`);
	if (!response.ok) {
		throw new Error(response.statusText);
	}
	console.log(response);
};
