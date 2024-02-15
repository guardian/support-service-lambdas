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
	if (!process.env.SALESFORCE_API_DOMAIN) {
		throw new Error('No env');
	}

	const token = await fetchToken();
	console.log(token[0]);
	console.log(process.env.SALESFORCE_API_DOMAIN);
	console.log(
		`${process.env.SALESFORCE_API_DOMAIN}/services/data/v59.0/jobs/query/${event.queryJobId}/results`,
	);

	try {
		console.log('here');
		const response = await fetch(
			`${process.env.SALESFORCE_API_DOMAIN}/services/data/v59.0/jobs/query/${event.queryJobId}/results`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					Accept: 'application/json',
				},
			},
		);
		console.log(response);

		const json = (await response.json()) as string;
		console.log(json);
		return 'OK';
	} catch (error) {
		console.error('Error during request here: ', error);
		throw new Error('Error csv');
	}

	// Save CSV to S3
};

const fetchToken = async () => {
	try {
		const input = {
			SecretId:
				'events!connection/salesforce-disaster-recovery-CODE-salesforce-api/e2792d75-414a-48f3-89a1-5e8eac15f627',
		};
		const command = new GetSecretValueCommand(input);
		const response1 = await secretsManagerClient.send(command);

		if (!response1.SecretString) throw new Error('No secret');

		const secretValue = JSON.parse(response1.SecretString) as {
			authorization_endpoint: string;
			client_id: string;
			client_secret: string;
			oauth_http_parameters: {
				body_parameters: Array<{ key: string; value: string }>;
			};
		};
		const formData = new URLSearchParams([
			['client_id', secretValue.client_id],
			['client_secret', secretValue.client_secret],
		]);

		secretValue.oauth_http_parameters.body_parameters.forEach((param) => {
			formData.append(param.key, param.value);
		});

		const response2 = await fetch(secretValue.authorization_endpoint, {
			method: 'POST',
			body: formData,
		});

		const json = (await response2.json()) as {
			access_token: string;
			instance_url: string;
			id: string;
			token_type: string;
			issued_at: string;
			signature: string;
		};

		// console.log(json);
		// console.log(Object.keys(json));
		// console.log(Object.entries(json));
		// console.log(Object.values(json));
		// console.log(typeof json['access_token']);
		// console.log(typeof json.access_token);
		// console.log(typeof json);
		// return json['access_token'];
		// return Object.values(json)[0] ?? '';
		return json.access_token;
	} catch (error) {
		console.error('Error during request before: ', error);
		throw new Error('Failed to get access token');
	}
};
