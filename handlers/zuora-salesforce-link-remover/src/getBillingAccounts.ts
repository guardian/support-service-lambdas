import type { ApiUserSecret, ConnectedAppSecret } from "./secrets";
import { getSecretValue } from "./secrets";

export async function handler() {
	const connectedAppSecretName = 'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox'; //TODO in future pr: add a function that returns appropriate secret depending on env
	const apiUserSecretName = 'DEV/Salesforce/User/MembersDataAPI'; //TODO in future pr: add a function that returns appropriate secret depending on env

	const connectedAppSecretValue = await getSecretValue<ConnectedAppSecret>( connectedAppSecretName );
	const apiUserSecretValue = await getSecretValue<ApiUserSecret>( apiUserSecretName );

	console.log('connectedAppSecretValue.name:',connectedAppSecretValue.name);
	console.log('connectedAppSecretValue.authUrl:',connectedAppSecretValue.authUrl);
	console.log('apiUserSecretValue.username:',apiUserSecretValue.username);
	
	return 'abcdef';
}
