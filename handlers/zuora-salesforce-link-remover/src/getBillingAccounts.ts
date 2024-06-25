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

	const sfConnectedAppAuth : SfConnectedAppAuth = {clientId, clientSecret};
	const sfApiUserAuth : SfApiUserAuth = {url: authUrl, grant_type:'password', username, password, token};

	await doSfAuth(sfApiUserAuth, sfConnectedAppAuth);
	return;
}

export async function doSfAuth(sfApiUserAuth: SfApiUserAuth, sfConnectedAppAuth: SfConnectedAppAuth): Promise<SfAuthResponse> {
	console.log('1. authenticating with Salesforce...');

	try{

		const body = buildBody(sfApiUserAuth, sfConnectedAppAuth);
		const options = {
			method: "POST",
			headers: {"Content-Type":"application/x-www-form-urlencoded"},
			body
		};
		// console.log('1a. body:',body);
		const url = `${sfApiUserAuth.url}${'/services/oauth2/token'}`;
		console.log('1aa. url:',url);

		const result = await fetch(url, options);
		console.log('2. result:',result);
		console.log('2a. result.ok:',result.ok);



		if(!result.ok){
			throw new Error();
			// throw new Error(`Something went wrong authenticating with Salesforce. error:${authResponse.error} | error_description:${authResponse.error_description}. Status: ${result.status} | Status Text: ${result.statusText}.`);
		}		
		const contentType = result.headers.get('content-type');
		console.log('3. contentType:', contentType);

		let authResponse;
		if (contentType && contentType.includes('application/json')) {
			authResponse = await result.json();
		} else {
			const text = await result.text();
			throw new Error(`Unexpected response content type: ${contentType}. Response text: ${text}`);
		}

		console.log('3. authResponse:', JSON.stringify(authResponse));
		console.log('successfully authenticated with Salesforce.');
		return authResponse as SfAuthResponse;
	}catch(error){
		throw new Error(`Error to authenticate with sf: ${JSON.stringify(error)}`);
 	}
}

function buildBody(sfApiUserAuth: SfApiUserAuth, sfConnectedAppAuth: SfConnectedAppAuth){
	return `grant_type=password` + 
	`&client_id=${sfConnectedAppAuth.clientId}` + 
	`&client_secret=${sfConnectedAppAuth.clientSecret}` + 
	`&username=${sfApiUserAuth.username}` + 
	`&password=${sfApiUserAuth.password}${sfApiUserAuth.token}`;
}

export type SfAuthResponse = {
	access_token: string;
	instance_url: string;
};

export type SfConnectedAppAuth = {
	clientId: string;
	clientSecret: string;
};

export type SfApiUserAuth = {
	url: string;
	grant_type: string;
	username: string;
	password: string;
	token: string;
};

