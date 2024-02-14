// import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

// const s3Client = new S3Client({ region: process.env.region });
const secretsManagerClient = new SecretsManagerClient({
	region: process.env.region,
});

export const handler = async (event: { queryJobId: string }) => {
	console.log(event);
	console.log('Inside lambda...');

	if (!process.env.SALESFORCE_API_DOMAIN) {
		throw new Error('No env');
	}

	// Get secret
	const input = {
		SecretId:
			'events!connection/salesforce-disaster-recovery-CODE-salesforce-api/e2792d75-414a-48f3-89a1-5e8eac15f627',
	};
	const command = new GetSecretValueCommand(input);
	const response = await secretsManagerClient.send(command);

	if (!response.SecretString) throw new Error('No secret');

	const secretValue = JSON.parse(response.SecretString) as {
		authorization_endpoint: string;
		client_id: string;
		client_secret: string;
		oauth_http_parameters: {
			body_parameters: Array<{ key: string; value: string }>;
		};
	};

	let token = '';
	console.log(response.SecretString[0], response.SecretString.length);

	// Get Salesforce token
	try {
		const formData = new URLSearchParams([
			['client_id', secretValue.client_id],
			['client_secret', secretValue.client_secret],
		]);
		console.log('1');

		secretValue.oauth_http_parameters.body_parameters.forEach((param) => {
			formData.append(param.key, param.value);
		});
		console.log('2');

		const response = await fetch(secretValue.authorization_endpoint, {
			method: 'POST',
			body: formData,
		});
		console.log('3');

		if (response.ok) {
			console.log('ok');
			console.log(response.ok);
			console.log(response.body);
			console.log(response.json());
			// console.log(response);
			const data = (await response.json()) as { access_token: string };
			token = data.access_token;
		} else {
			console.log('4');
			console.error('Failed to get access token: ', response.statusText);
			throw new Error('Error');
		}
	} catch (error) {
		console.error('Error during request: ', error);
		throw new Error('Failed to get access token');
	}

	// Get Query result
	try {
		const response = await fetch(
			`${process.env.SALESFORCE_API_DOMAIN}/services/data/v59.0/jobs/query/${event.queryJobId}/results`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (response.ok) {
			const data = (await response.json()) as string;
			console.log('OK');
			console.log(data.length);
			return data;
		} else {
			console.error('Failed to get query result: ', response.statusText);
			throw new Error('Error');
		}
	} catch (error) {
		console.error('Error during request: ', error);
		throw new Error('Error');
	}

	// Save CSV to S3
};
