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

	async requestVoucher(voucherType: string): Promise<ImovoVoucherResponse> {
		const apiKey = await this.getApiKey();

		const response = await fetch(`${this.baseUrl}/VoucherRequest/Request`, {
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
