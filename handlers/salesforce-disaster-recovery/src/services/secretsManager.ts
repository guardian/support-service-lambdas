import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const secretsManagerClient = new SecretsManagerClient({
	region: process.env.region,
});

export const getSecretValue = async <T>({
	secretName,
}: {
	secretName: string;
}): Promise<T> => {
	try {
		const command = new GetSecretValueCommand({
			SecretId: secretName,
		});

		const response = await secretsManagerClient.send(command);

		if (!response.SecretString) {
			throw new Error('No secret found.');
		}

		const secretValue = JSON.parse(response.SecretString) as T;

		return secretValue;
	} catch (error) {
		console.error(error);
		throw new Error('No secret for Salesforce Oauth credentials.');
	}
};
