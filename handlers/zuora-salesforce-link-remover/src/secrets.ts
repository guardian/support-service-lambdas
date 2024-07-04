import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import type { Stage } from '@modules/stage';

export function getSalesforceSecretNames(stage: Stage): SecretNames {
	switch (stage) {
		case 'CODE':
			return {
				apiUserSecretName: 'DEV/Salesforce/User/integrationapiuser',
				connectedAppSecretName:
					'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox',
			};
			case 'PROD':
				return {
					apiUserSecretName: 'PROD/Salesforce/User/BillingAccountRemoverAPIUser',
					connectedAppSecretName:
						'PROD/Salesforce/ConnectedApp/AwsConnectorSandbox',
				};
			default :
				return {
					apiUserSecretName: '',
					connectedAppSecretName: '',
				};
	}
}

export function getZuoraSecretName(stage: 'CODE' | 'PROD'): string {
	switch (stage) {
		case 'CODE':
			return 'CODE/Zuora-OAuth/SupportServiceLambdas';
		case 'PROD':
			return 'PROD/Zuora/SupportServiceLambdas';
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
			throw new Error(`No secret found with name: ${secretName}`);
		}

		return JSON.parse(response.SecretString) as T;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorText = `error getting secret: ${errorMessage}`;
		console.error(errorText);
		throw new Error(errorText);
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

export type ZuoraSecret = {
	clientId: string;
	clientSecret: string;
};
