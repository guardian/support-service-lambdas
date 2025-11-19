import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { awsConfig } from '@modules/aws/config';

export async function getSecretValue<T>(secretName: string): Promise<T> {
	try {
		const secretsManagerClient = new SecretsManagerClient({
			region: awsConfig.region,
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
