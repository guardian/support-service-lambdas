import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

export function getSecretNameDependingOnEnvironment(
	stage: string,
): SecretNames {
	switch (stage) {
		case 'CODE':
			return {
				apiUserSecretName: 'DEV/Salesforce/User/integrationuserapi',
				connectedAppSecretName:
					'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox',
			};
		case 'PROD':
			return {
				apiUserSecretName: 'PROD/Salesforce/User/BillingAccountRemoverAPIUser',
				connectedAppSecretName:
					'PROD/Salesforce/ConnectedApp/AwsConnectorSandbox',
			};
		default:
			return {
				apiUserSecretName: '',
				connectedAppSecretName: '',
			};
	}
}

export async function getSecretValue<T>(secretName: string): Promise<T> {
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

export type SecretNames = {
	apiUserSecretName: string;
	connectedAppSecretName: string;
};

export type ConnectedAppSecret = {
	name: string;
	authUrl: string;
	clientId: string;
	clientSecret: string;
};

export type ApiUserSecret = {
	username: string;
	password: string;
	token: string;
};
