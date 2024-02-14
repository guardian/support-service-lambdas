import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
	SecretsManagerClient,
	GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const s3Client = new S3Client({ region: process.env.region });
const secretsManagerClient = new SecretsManagerClient({
	region: process.env.region,
});

export const handler = async (event: { queryJobId: string }) => {
	console.log(event);
	console.log('Inside lambda...');

	// Get secret
	const input = {
		SecretId:
			'events!connection/salesforce-disaster-recovery-CODE-salesforce-api/e2792d75-414a-48f3-89a1-5e8eac15f627',
	};
	const command = new GetSecretValueCommand(input);
	const response = await secretsManagerClient.send(command);

	if (!response.SecretString) throw new Error('No secret');

	const secretValue = JSON.parse(response.SecretString);

	let token = '';
	console.log(token[0]);

	// Get Salesforce token
	try {
		const formData = new URLSearchParams([
			['client_id', secretValue.client_id],
			['client_secret', secretValue.client_secret],
			[
				'grant_type',
				secretValue.oauth_http_parameters.body_parameters[0].value,
			],
			['username', secretValue.oauth_http_parameters.body_parameters[1].value],
			['password', secretValue.oauth_http_parameters.body_parameters[2].value],
		]);

		const response = await fetch(secretValue.authorization_endpoint, {
			method: 'POST',
			body: formData,
		});

		if (response.ok) {
			const data = (await response.json()) as { access_token: string };
			token = data.access_token;
		} else {
			console.error('Failed to get access token: ', response.statusText);
			throw new Error('Error');
		}
	} catch (error) {
		console.error('Error during request: ', error);
		throw new Error('Error');
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
