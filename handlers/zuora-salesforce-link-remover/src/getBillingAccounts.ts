import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

export async function handler() {
	const secretName = 'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox'; //TODO in future pr: add a function that returns appropriate secret depending on env

	await getSecretValue( secretName );

	return 'abcdef';
}

export async function getSecretValue(secretName: string): Promise<ConnectedAppSecret>{
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

		return JSON.parse(response.SecretString) as ConnectedAppSecret;
	} catch (error) {
		console.error('error:', error);
		throw error;
	}
}

type ConnectedAppSecret = {
	name: string;
	authUrl: string;
};
