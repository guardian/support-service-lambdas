import type { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { VoucherProvider } from '../domain/ports';
import type { ImovoVoucherResponse } from '../domain/schemas';
import { imovoVoucherResponseSchema } from '../domain/schemas';

export class ImovoVoucherProvider implements VoucherProvider {
	private cachedApiKey: string | undefined;

	constructor(
		private readonly secretsClient: SecretsManagerClient,
		private readonly stage: string,
		private readonly baseUrl: string,
	) {}

	async requestVoucher(
		campaignCode: string,
		customerReference: string,
	): Promise<ImovoVoucherResponse> {
		const apiKey = await this.getApiKey();

		const url = new URL(`${this.baseUrl}/VoucherRequest/Request`);
		url.searchParams.set('campaignCode', campaignCode);
		url.searchParams.set('customerReference', customerReference);

		const response = await fetch(url.toString(), {
			method: 'POST',
			headers: {
				'X-API-KEY': apiKey,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`i-movo API error (${response.status}): ${errorText}`);
		}

		const json: unknown = await response.json();
		console.log(`i-movo API response: ${JSON.stringify(json)}`);

		const parsed = imovoVoucherResponseSchema.parse(json);

		if (!parsed.successfulRequest) {
			const errors = parsed.errorMessages?.join(', ') ?? 'unknown error';
			throw new Error(`i-movo voucher request failed: ${errors}`);
		}

		if (!parsed.voucherCode || !parsed.expiryDate) {
			throw new Error(
				'i-movo response missing voucherCode or expiryDate despite successfulRequest=true',
			);
		}

		return parsed;
	}

	private async getApiKey(): Promise<string> {
		if (this.cachedApiKey) {
			return this.cachedApiKey;
		}

		const response = await this.secretsClient.send(
			new GetSecretValueCommand({
				SecretId: `${this.stage}/imovo-voucher-api/api-key`,
			}),
		);

		if (!response.SecretString) {
			throw new Error('i-movo API key secret is empty');
		}

		this.cachedApiKey = response.SecretString;
		return this.cachedApiKey;
	}
}
