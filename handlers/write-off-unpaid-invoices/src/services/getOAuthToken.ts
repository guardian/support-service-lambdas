import {
	SecretsManagerClient,
	GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

// import { Stage } from '../scripts/createInvoiceItemAdjustment';

const client = new SecretsManagerClient({ region: 'eu-west-1' });

async function getZuoraOAuthSecret({ stage }: { stage: Stage }): Promise<{
	client_id: string;
	client_secret: string;
}> {
	const secretId = `${stage}/Zuora/User/AndreaDiotallevi`;

	try {
		const command = new GetSecretValueCommand({ SecretId: secretId });
		const response = await client.send(command);

		return JSON.parse(response.SecretString || '') as {
			client_id: string;
			client_secret: string;
		};
	} catch (error) {
		throw error;
	}
}

export async function getZuoraOAuthToken({
	stage,
}: {
	stage: Stage;
}): Promise<string> {
	const { client_id, client_secret } = await getZuoraOAuthSecret({ stage });

	const endpoint = {
		CODE: `https://rest.apisandbox.zuora.com/oauth/token`,
		CSBX: `https://rest.test.zuora.com/oauth/token`,
		PROD: `https://rest.zuora.com/oauth/token`,
	};

	const tokenUrl = endpoint[stage];

	const body = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id,
		client_secret,
	});

	try {
		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body.toString(),
		});

		const data = (await response.json()) as { access_token: string };
		return data.access_token;
	} catch (error) {
		throw error;
	}
}
