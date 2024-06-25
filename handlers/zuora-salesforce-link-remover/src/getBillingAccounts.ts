import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

export async function handler() {
	console.log('getting secret...');
	const secretName = 'DEV/Salesforce/ConnectedApp/AwsConnectorSandbox';

	const secret = await getSecretValue({ secretName });
	console.log('secret = ', secret);
	return 'abcdef';
}

export const getSecretValue = async ({
	secretName,
}: {
	secretName: string;
}): Promise<ConnectedAppSecret> => {

	const secretsManagerClient = new SecretsManagerClient({
		region: process.env.region,
	});

	try {
		const command = new GetSecretValueCommand({
			SecretId: secretName,
		});

		const response = await secretsManagerClient.send(command);
		if (!response.SecretString) {
			throw new Error('No secret found');
		}

		const secretValue = JSON.parse(response.SecretString) as ConnectedAppSecret;
		
		console.log('secretValue.name:', secretValue.name);
		console.log('secretValue.authUrl:', secretValue.authUrl);

		return secretValue;
	} catch (error) {
		console.error('error:', error);
		throw error;
	}
};

type ConnectedAppSecret = {
	name: string;
	authUrl: string;
};
