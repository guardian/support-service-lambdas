import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import type { ImovoVoucherResponse } from './schemas';
import { imovoVoucherResponseSchema } from './schemas';

const secretsClient = new SecretsManagerClient({});

let cachedApiKey: string | undefined;

async function getApiKey(stage: string): Promise<string> {
	if (cachedApiKey) {
		return cachedApiKey;
	}

	const response = await secretsClient.send(
		new GetSecretValueCommand({
			SecretId: `${stage}/imovo-voucher-api/api-key`,
		}),
	);

	if (!response.SecretString) {
		throw new Error('i-movo API key secret is empty');
	}

	cachedApiKey = response.SecretString;
	return cachedApiKey;
}

export async function requestVoucher(
	stage: string,
	baseUrl: string,
	voucherType: string,
): Promise<ImovoVoucherResponse> {
	const apiKey = await getApiKey(stage);

	const response = await fetch(`${baseUrl}/VoucherRequest/Request`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-KEY': apiKey,
		},
		body: JSON.stringify({
			VoucherType: voucherType,
			Quantity: 1,
		}),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`i-movo API error (${response.status}): ${errorText}`);
	}

	const json: unknown = await response.json();
	return imovoVoucherResponseSchema.parse(json);
}
