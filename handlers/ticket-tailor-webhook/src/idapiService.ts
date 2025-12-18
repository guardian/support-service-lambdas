import { logger } from '@modules/routing/logger';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { Stage } from '@modules/stage';
import { z } from 'zod';

export type IdApiToken = {
	token: string;
};

const UserTypeResponseSchema = z.object({
	userType: z.string(),
});

type UserTypeResponse = z.infer<typeof UserTypeResponseSchema>;

const userTypeEndpoint = `/user/type/`;
const guestEndpoint = '/guest?accountVerificationEmail=true';

const getIdapiUrl = (stage: Stage) => {
	const idapiUrl =
		stage === 'PROD'
			? 'https://idapi.theguardian.com'
			: 'https://idapi.code.dev-theguardian.com';

	return idapiUrl;
};

export const fetchUserType = async (
	email: string,
	stage: Stage,
): Promise<UserTypeResponse> => {
	const idapiSecret = await getSecretValue<IdApiToken>(
		`${stage}/TicketTailor/IdApi-token`,
	);

	logger.log(`Fetching user type for provided email.`);
	const bearerToken = `Bearer ${idapiSecret.token}`;

	const userTypeResponse = await fetch(
		getIdapiUrl(stage).concat(userTypeEndpoint).concat(email),
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-GU-ID-Client-Access-Token': bearerToken,
			},
		},
	);
	if (!userTypeResponse.ok) {
		const errorMessage = `Get userType request failed with status: ${userTypeResponse.statusText}. Response body is: ${JSON.stringify(userTypeResponse.body)}`;
		logger.error(errorMessage);
		throw new Error(errorMessage);
	}
	const responseJson = await userTypeResponse.json();
	const validationResult = UserTypeResponseSchema.safeParse(responseJson);
	if (!validationResult.success) {
		const errorMessage = `UserType request returned invalid data. Response body is: ${JSON.stringify(userTypeResponse.body)}`;
		logger.error(errorMessage);
		throw new Error(errorMessage);
	}
	logger.log(`Request ok. User type is: ${validationResult.data.userType}`);
	return validationResult.data;
};

export const createGuestAccount = async (
	email: string,
	stage: Stage,
): Promise<void> => {
	const idapiSecret = await getSecretValue<IdApiToken>(
		`${stage}/TicketTailor/IdApi-token`,
	);
	const bearerToken = `Bearer ${idapiSecret.token}`;
	const response = await fetch(getIdapiUrl(stage).concat(guestEndpoint), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-GU-ID-Client-Access-Token': bearerToken,
			Origin: 'https://theguardian.com',
		},
		body: JSON.stringify({ primaryEmailAddress: email }),
	});
	logger.log(`Create Guest Account response status: ${response.statusText}`);
	if (!response.ok) {
		throw new Error(
			`Guest account failed with status ${JSON.stringify(response)}.`,
		);
	}
};
