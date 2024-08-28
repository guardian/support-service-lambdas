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
		console.error(
			`Get userType request for ${email} failed with status: ${userTypeResponse.statusText}. Response body is: ${JSON.stringify(userTypeResponse.body)}`,
		);
		throw new Error(
			`Get userType request for ${email} failed with status: ${userTypeResponse.statusText}. Response body is: ${JSON.stringify(userTypeResponse.body)}`,
		);
	}
	console.log(
		`Request ok. Status is: ${userTypeResponse.statusText}. Response type is ${userTypeResponse.type}.`,
	);
	return (await userTypeResponse.json()) as UserTypeResponse;
};

export const createGuestAccount = async (email: string): Promise<void> => {
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
		throw new Error(
			`Guest account creation for email: ${email} with status ${response.statusText}. Response body is: ${JSON.stringify(response.body)}`,
		);
	}
	console.log(`Full response body: ${JSON.stringify(response)}`);
};
