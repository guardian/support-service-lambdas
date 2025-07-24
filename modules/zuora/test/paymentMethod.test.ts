import { getPaymentMethods } from '@modules/zuora/paymentMethod';
import { zuoraResponseSchema } from '@modules/zuora/types';

describe('getPaymentMethods', () => {
	const mockGet = jest.fn();
	const mockZuoraClient = { get: mockGet } as any;

	const accountId = 'test-account-id';
	const mockResponse = { some: 'response' };

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('calls zuoraClient.get with correct path and schema', async () => {
		mockGet.mockResolvedValue(mockResponse);

		await getPaymentMethods(mockZuoraClient, accountId);

		expect(mockGet).toHaveBeenCalledWith(
			`/v1/accounts/${accountId}/payment-methods`,
			zuoraResponseSchema,
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
