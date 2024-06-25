import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

export function handler() {
	console.log('getting secret...');
	const secretName = "DEV/Salesforce/ConnectedApp/AwsConnectorSandbox"

	const secret = getSecretValue({secretName});
	console.log('secret = ', secret);
	return 'abcdef';
}


export const getSecretValue = async <T>({
	secretName,
}: {
	secretName: string;
}): Promise<T> => {
	console.log('1. secretName:', secretName);

	const secretsManagerClient = new SecretsManagerClient({
		region: process.env.region,
	});

	try {
		const command = new GetSecretValueCommand({
			SecretId: secretName,
		});

		const response = await secretsManagerClient.send(command);
		console.log('2. secret response:', response);
		if (!response.SecretString) {
			throw new Error('No secret found');
		}
		console.log('3. response.SecretString:', response.SecretString);

		const secretValue = JSON.parse(response.SecretString) as T;
		console.log('4. secretValue:', secretValue);

		return secretValue;
	} catch (error) {
		console.error('error:',error);
		throw error;
	}
};
