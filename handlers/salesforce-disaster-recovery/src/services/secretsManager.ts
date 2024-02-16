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
		console.error(error);

		let errorMessage = 'Failed to get secret value';
		const errorName = 'Name';

		if (error && typeof error === 'object' && 'message' in error) {
			errorMessage = error.message as string;
		}

		console.log('MESSAGE');
		console.log(errorMessage);

		console.log('NAME');
		console.log(errorName);

		throw new Error(errorMessage);
	}
};
