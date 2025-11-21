import { getPaymentMethods } from '@modules/zuora/paymentMethod';
import { voidSchema } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

describe('getPaymentMethods', () => {
	const mockGet = jest.fn();

	function buildMockZuoraClient(): jest.Mocked<ZuoraClient> {
		return {
			zuoraServerUrl: 'https://zuora.example',
			tokenProvider: {
				getToken: jest.fn().mockResolvedValue('test-token'),
			},
			get: mockGet,
			post: jest.fn(),
			put: jest.fn(),
			delete: jest.fn(),
			fetch: jest.fn(),
		} as unknown as jest.Mocked<ZuoraClient>;
	}

	const mockZuoraClient = buildMockZuoraClient();

	const accountId = 'test-account-id';
	const mockResponse = { some: 'response' };

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('calls zuoraClient.get with correct path and schema', async () => {
		mockGet.mockResolvedValue(mockResponse);

		await getPaymentMethods(mockZuoraClient, accountId, voidSchema);

		expect(mockGet).toHaveBeenCalledWith(
			`/v1/accounts/${accountId}/payment-methods`,
			voidSchema,
		);
	});

	it('returns the response from zuoraClient.get', async () => {
		mockGet.mockResolvedValue(mockResponse);

		const result = await getPaymentMethods(mockZuoraClient, accountId);

		expect(result).toBe(mockResponse);
	});

	it('propagates errors from zuoraClient.get', async () => {
		const error = new Error('fail');
		mockGet.mockRejectedValue(error);

		await expect(getPaymentMethods(mockZuoraClient, accountId)).rejects.toThrow(
			'fail',
		);
	});
});
