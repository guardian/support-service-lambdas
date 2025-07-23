import { mockZuoraClient } from '../test/mocks/mockZuoraClient';
import { applyCreditToAccountBalance } from '@modules/zuora/applyCreditToAccountBalance';
import { zuoraResponseSchema } from '@modules/zuora/types';

jest.mock('@modules/zuora/zuoraClient');

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn().mockReturnValue('PROD'),
}));

describe('applyCreditToAccountBalance', () => {
	it('should process a successful credit balance adjustment', async () => {
		const mockResponse = { Success: true };
		mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

		const body = JSON.stringify({
			Amount: 1,
			SourceTransactionNumber: 'XXX',
			Type: 'Increase',
		});

		const result = await applyCreditToAccountBalance(
			mockZuoraClient,
			body,
			zuoraResponseSchema,
		);

		expect(mockZuoraClient.post).toHaveBeenCalledWith(
			'/v1/object/credit-balance-adjustment',
			body,
			zuoraResponseSchema,
		);
		expect(result).toEqual(mockResponse);
	});

	it('should throw if zuoraClient.post rejects', async () => {
		const error = new Error('Network error');
		mockZuoraClient.post = jest.fn().mockRejectedValue(error);

		const body = JSON.stringify({
			Amount: 1,
			SourceTransactionNumber: 'XXX',
			Type: 'Increase',
		});

		await expect(
			applyCreditToAccountBalance(mockZuoraClient, body, zuoraResponseSchema),
		).rejects.toThrow('Network error');
	});

	it('should validate response schema', async () => {
		const invalidResponse = { NotSuccess: false };
		mockZuoraClient.post = jest.fn().mockResolvedValue(invalidResponse);

		const body = JSON.stringify({
			Amount: 1,
			SourceTransactionNumber: 'XXX',
			Type: 'Increase',
		});

		await expect(
			applyCreditToAccountBalance(mockZuoraClient, body, zuoraResponseSchema),
		).resolves.toEqual(invalidResponse);
	});
});
