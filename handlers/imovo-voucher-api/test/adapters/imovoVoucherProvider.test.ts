import type { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { ImovoVoucherProvider } from '../../src/adapters/imovoVoucherProvider';

const mockSend = jest.fn();
const mockSecretsClient = {
	send: mockSend,
} as unknown as SecretsManagerClient;

const baseUrl = 'https://api.example.com';
const stage = 'CODE';

const validApiResponse = {
	voucherCode: 'VOUCHER-123',
	expiryDate: '2026-12-31',
	balance: 5.0,
	message: 'Success',
	successfulRequest: true,
};

beforeEach(() => {
	jest.restoreAllMocks();
	mockSend.mockReset();
});

describe('ImovoVoucherProvider', () => {
	describe('requestVoucher', () => {
		it('fetches the API key and calls the i-movo API with correct parameters', async () => {
			mockSend.mockResolvedValueOnce({
				SecretString: 'test-api-key',
			});
			jest.spyOn(global, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify(validApiResponse), {
					status: 200,
				}),
			);

			const provider = new ImovoVoucherProvider(
				mockSecretsClient,
				stage,
				baseUrl,
			);
			const result = await provider.requestVoucher('DIGITAL_REWARD');

			expect(result).toEqual(validApiResponse);

			expect(global.fetch).toHaveBeenCalledWith(
				`${baseUrl}/VoucherRequest/Request`,
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-API-KEY': 'test-api-key',
					},
					body: JSON.stringify({
						VoucherType: 'DIGITAL_REWARD',
						Quantity: 1,
					}),
				}),
			);
		});

		it('caches the API key across multiple calls', async () => {
			mockSend.mockResolvedValueOnce({
				SecretString: 'test-api-key',
			});
			jest.spyOn(global, 'fetch').mockImplementation(() =>
				Promise.resolve(
					new Response(JSON.stringify(validApiResponse), {
						status: 200,
					}),
				),
			);

			const provider = new ImovoVoucherProvider(
				mockSecretsClient,
				stage,
				baseUrl,
			);
			await provider.requestVoucher('TYPE_A');
			await provider.requestVoucher('TYPE_B');

			expect(mockSend).toHaveBeenCalledTimes(1);
			expect(global.fetch).toHaveBeenCalledTimes(2);
		});

		it('throws when the i-movo API returns a non-ok response', async () => {
			mockSend.mockResolvedValueOnce({
				SecretString: 'test-api-key',
			});
			jest
				.spyOn(global, 'fetch')
				.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

			const provider = new ImovoVoucherProvider(
				mockSecretsClient,
				stage,
				baseUrl,
			);

			await expect(provider.requestVoucher('DIGITAL_REWARD')).rejects.toThrow(
				'i-movo API error (401): Unauthorized',
			);
		});

		it('throws when the API response does not match the expected schema', async () => {
			mockSend.mockResolvedValueOnce({
				SecretString: 'test-api-key',
			});
			jest.spyOn(global, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ unexpected: 'data' }), {
					status: 200,
				}),
			);

			const provider = new ImovoVoucherProvider(
				mockSecretsClient,
				stage,
				baseUrl,
			);

			await expect(provider.requestVoucher('DIGITAL_REWARD')).rejects.toThrow();
		});
	});

	describe('getApiKey (via requestVoucher)', () => {
		it('uses the correct secret ID based on stage', async () => {
			mockSend.mockResolvedValueOnce({
				SecretString: 'test-api-key',
			});
			jest.spyOn(global, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify(validApiResponse), {
					status: 200,
				}),
			);

			const provider = new ImovoVoucherProvider(
				mockSecretsClient,
				'PROD',
				baseUrl,
			);
			await provider.requestVoucher('DIGITAL_REWARD');

			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({
					input: {
						SecretId: 'PROD/imovo-voucher-api/api-key',
					},
				}),
			);
		});

		it('throws when the secret string is empty', async () => {
			mockSend.mockResolvedValueOnce({
				SecretString: undefined,
			});

			const provider = new ImovoVoucherProvider(
				mockSecretsClient,
				stage,
				baseUrl,
			);

			await expect(provider.requestVoucher('DIGITAL_REWARD')).rejects.toThrow(
				'i-movo API key secret is empty',
			);
		});
	});
});
