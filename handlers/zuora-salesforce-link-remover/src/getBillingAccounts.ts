import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

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

export async function getSecretValue<T>(secretName: string): Promise<T>{
	try {
		const secretsManagerClient = new SecretsManagerClient({
			region: process.env.region,
		});

		const command = new GetSecretValueCommand({
			SecretId: secretName,
		});

		const response = await secretsManagerClient.send(command);
		
		if (!response.SecretString) {
			throw new Error(`No secret found with name:$secretName`);
		}

		return JSON.parse(response.SecretString) as T;
	} catch (error) {
		console.error('error:', error);
		throw error;
	}
}

type ConnectedAppSecret = {
	name: string;
	authUrl: string;
};

type ApiUserSecret = {
	username: string;
	password: string;
	token: string;
};
