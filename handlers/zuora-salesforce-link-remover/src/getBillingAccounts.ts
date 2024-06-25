import type { ApiUserSecret, ConnectedAppSecret } from './secrets';
import { getSecretValue } from './secrets';

export async function handler() {
	//TODO in future pr: add a module that returns obtains secrets depending on env
	const connectedAppSecretName =
		'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox';
	const apiUserSecretName = 'DEV/Salesforce/User/MembersDataAPI';

	const connectedAppSecretValue = await getSecretValue<ConnectedAppSecret>(
		connectedAppSecretName,
	);
	const apiUserSecretValue =
		await getSecretValue<ApiUserSecret>(apiUserSecretName);

	const { authUrl, clientId, clientSecret } = connectedAppSecretValue;
	const { username, password, token } = apiUserSecretValue;

	await doSfAuth(authUrl, clientId, clientSecret, username, password, token);
	return;
}

export async function doSfAuth(
	authUrl: string,
	clientId: string,
	clientSecret: string,
	username: string,
	password: string,
	token: string,
): Promise<SfAuthResponse> {
	console.log('authenticating with Salesforce...');

	try {
		const options = {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: buildBody(clientId, clientSecret, username, password, token),
		};

		const result = await fetch(authUrl, options);
		const authResponse = (await result.json()) as SfAuthResponse;

		if (!result.ok) {
			throw new Error(`Something went wrong authenticating with Salesforce. authResponse: ${JSON.stringify(authResponse)}`); // error:${authResponse.error} | error_description:${authResponse.error_description}. Status: ${result.status} | Status Text: ${result.statusText}.`);
		}

		console.log(
			'successfully authenticated with Salesforce. instance_url:',
			authResponse.instance_url,
		);
		return authResponse;
	} catch (error) {
		throw new Error(`Error authenticating with sf`); //: ${error}`);
	}
}

function buildBody(
	clientId: string,
	clientSecret: string,
	username: string,
	password: string,
	token: string,
) {
	return (
		`grant_type=password` +
		`&client_id=${clientId}` +
		`&client_secret=${clientSecret}` +
		`&username=${username}` +
		`&password=${password}${token}`
	);
}

export type SfAuthResponse = {
	access_token: string;
	instance_url: string;
};
