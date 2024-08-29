import { getSecretValue } from '@modules/secrets-manager/src/getSecret';
import { stageFromEnvironment } from '@modules/stage';

export type IdApiToken = {
	token: string;
};

export type UserTypeResponse = {
	userType: string;
};

const userTypeEndpoint = `/user/type/`;
const guestEndpoint = '/guest?accountVerificationEmail=true';

const getIdapiUrl = () => {
	const stage = stageFromEnvironment();

	const idapiUrl =
		stage === 'PROD'
			? 'https://idapi.theguardian.com'
			: 'https://idapi.code.dev-theguardian.com';

	return idapiUrl;
};

export const fetchUserType = async (
	email: string,
): Promise<UserTypeResponse> => {
	const idapiSecret = await getSecretValue<IdApiToken>(
		`${stageFromEnvironment()}/TicketTailor/IdApi-token`,
	);

	console.log(`Fetching user type for provided email.`);
	const bearerToken = `Bearer ${idapiSecret.token}`;

	const userTypeResponse = await fetch(
		getIdapiUrl().concat(userTypeEndpoint).concat(email),
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
			`Get userType request failed with status: ${userTypeResponse.statusText}. Response body is: ${JSON.stringify(userTypeResponse.body)}`,
		);
		throw new Error(
			`Get userType request failed with status: ${userTypeResponse.statusText}. Response body is: ${JSON.stringify(userTypeResponse.body)}`,
		);
	}
	const parsedResponse = (await userTypeResponse.json()) as UserTypeResponse;
	console.log(`Request ok. User type is: ${parsedResponse.userType}`);
	return parsedResponse;
};

export const createGuestAccount = async (email: string): Promise<void> => {
	const idapiSecret = await getSecretValue<IdApiToken>(
		`${stageFromEnvironment()}/TicketTailor/IdApi-token`,
	);
	const bearerToken = `Bearer ${idapiSecret.token}`;
	const response = await fetch(getIdapiUrl().concat(guestEndpoint), {
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
			`Guest account failed with status ${JSON.stringify(response)}.`,
		);
	}
};
