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

// export async function doSfAuth(
// 	authUrl: string,
// 	clientId: string,
// 	clientSecret: string,
// 	username: string,
// 	password: string,
// 	token: string,
// ): Promise<unknown> { //Promise<SfAuthResponse> {
// 	console.log('1. authenticating with Salesforce...');

// 	try {
// 		const options = {
// 			method: 'POST',
// 			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
// 			body: buildBody(clientId, clientSecret, username, password, token),
// 		};
	
// 		const result = await fetch(authUrl, options);
// 		console.log('2. result:',result);
// 		const authResponse = await result.json();
// 		console.log('3. authResponse:',authResponse);

// 		// if (!result.ok) {
// 		// 	throw new Error(`Something went wrong authenticating with Salesforce. authResponse: ${JSON.stringify(authResponse)}`); // error:${authResponse.error} | error_description:${authResponse.error_description}. Status: ${result.status} | Status Text: ${result.statusText}.`);
// 		// }

// 		// console.log(
// 		// 	'successfully authenticated with Salesforce. instance_url:',
// 		// 	authResponse.instance_url,
// 		// );
// 		return authResponse;
// 	} catch (error) {
// 		throw new Error(`Error authenticating with sf. error: ${JSON.stringify(error)}`);
// 	}
// }

async function doSfAuth(
	authUrl: string,
	clientId: string,
	clientSecret: string,
	username: string,
	password: string,
	token: string
  ): Promise<SfAuthResponse> {
	const url = `${authUrl}/services/oauth2/token`;
	const params = new URLSearchParams();
  
	params.append('grant_type', 'password');
	params.append('client_id', clientId);
	params.append('client_secret', clientSecret);
	params.append('username', username);
	params.append('password', password + token);
  
	const response = await fetch(url, {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/x-www-form-urlencoded'
	  },
	  body: params
	});
  
	if (!response.ok) {
	  throw new Error(`Error authenticating with Salesforce: ${response.statusText}`);
	}
  
	const data = await response.json();
	console.log('data: ', data);
	return data as SfAuthResponse;
  }

// function buildBody(
// 	clientId: string,
// 	clientSecret: string,
// 	username: string,
// 	password: string,
// 	token: string,
// ) {
// 	return (
// 		`grant_type=password` +
// 		`&client_id=${clientId}` +
// 		`&client_secret=${clientSecret}` +
// 		`&username=${username}` +
// 		`&password=${password}${token}`
// 	);
// }

export type SfAuthResponse = {
	access_token: string;
	instance_url: string;
};
