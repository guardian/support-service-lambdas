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
			// SecretId: secretName,
			SecretId: 'lskjdf',
		});
		console.log(secretName);

		const response = await secretsManagerClient.send(command);

		if (!response.SecretString) {
			throw new Error('No secret found');
		}

		const secretValue = JSON.parse(response.SecretString) as T;

		return secretValue;
	} catch (error) {
		console.log(typeof error);

		if (error) {
			console.log(Object.keys(error));
			console.log(Object.values(error));
			console.log(Object.entries(error));
			if (typeof error === 'object' && 'message' in error) {
				console.log(error.message);
			}
		}
		console.error(error);
		throw new Error('Failed to get secret value');
	}
};
