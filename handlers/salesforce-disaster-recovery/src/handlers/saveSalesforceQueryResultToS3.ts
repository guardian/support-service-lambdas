import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

const s3Client = new S3Client({ region: process.env.region });

const secretsManagerClient = new SecretsManagerClient({
	region: process.env.region,
});

export const handler = async (event: { queryJobId: string }) => {
	const s3Bucket = process.env.S3_BUCKET;
	const salesforceApiDomain = process.env.SALESFORCE_API_DOMAIN;
	const salesforceOauthSecretName = process.env.SALESFORCE_OAUTH_SECRET_NAME;

	if (!s3Bucket || !salesforceApiDomain || !salesforceOauthSecretName) {
		throw new Error('Environment variables not set.');
	}

	const secretValue = await getSecretValue({ salesforceOauthSecretName });
	const token = await fetchToken({ secretValue });
	const csvContent = await callSalesforce({
		token,
		queryJobId: event.queryJobId,
		salesforceApiDomain,
	});

	try {
		const command = new PutObjectCommand({
			Bucket: s3Bucket,
			Key: `test.csv`,
			Body: csvContent,
		});
		const response = await s3Client.send(command);
		console.log(response);
	} catch (error) {
		console.error(error);
	}
};

type Secret1 = {
	authorization_endpoint: string;
	client_id: string;
	client_secret: string;
	oauth_http_parameters: {
		body_parameters: Array<{ key: string; value: string }>;
	};
};

const getSecretValue = async ({
	salesforceOauthSecretName,
}: {
	salesforceOauthSecretName: string;
}) => {
	try {
		const command = new GetSecretValueCommand({
			SecretId: salesforceOauthSecretName,
		});

		const response = await secretsManagerClient.send(command);

		if (!response.SecretString) {
			throw new Error('No secret for Salesforce Oauth credentials.');
		}

		const secretValue = JSON.parse(response.SecretString) as Secret1;

		return secretValue;
	} catch (error) {
		console.error(error);
		throw new Error('No secret for Salesforce Oauth credentials.');
	}
};

const fetchToken = async ({ secretValue }: { secretValue: Secret1 }) => {
	try {
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

		return json.access_token;
	} catch (error) {
		console.error('Error during request before: ', error);
		throw new Error('Failed to get access token');
	}
};

const callSalesforce = async ({
	token,
	queryJobId,
	salesforceApiDomain,
}: {
	token: string;
	queryJobId: string;
	salesforceApiDomain: string;
}) => {
	try {
		const response = await fetch(
			`${salesforceApiDomain}/services/data/v59.0/jobs/query/${queryJobId}/results`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					// Accept: 'application/json',
				},
			},
		);

		const text = await response.text();

		return text;
	} catch (error) {
		console.error('Error during request here: ', error);
		throw new Error('Error csv');
	}
};
