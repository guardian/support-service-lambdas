import { mockZuoraClient } from '../test/mocks/mockZuoraClient';
import { applyCreditToAccountBalance } from '@modules/zuora/creditBalanceAdjustment';
import { zuoraResponseSchema } from '@modules/zuora/types';
import { z } from 'zod';

jest.mock('@modules/zuora/zuoraClient');

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn().mockReturnValue('PROD'),
}));

describe('applyCreditToAccountBalance', () => {
	it('should process a successful credit balance adjustment', async () => {
		const mockResponse = {
			Id: '8a12865f9836b7d7019836f101057d47',
			Success: true,
		};
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

	describe('dynamic typing', () => {
		it('should use default zuoraResponseSchema when no schema provided', async () => {
			const mockResponse = {
				Id: '8a12865f9836b7d7019836f101057d47',
				Success: true,
			};
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			const body = JSON.stringify({
				Amount: 1,
				SourceTransactionNumber: 'XXX',
				Type: 'Increase',
			});

			const result = await applyCreditToAccountBalance(mockZuoraClient, body);

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/object/credit-balance-adjustment',
				body,
				zuoraResponseSchema,
			);
			expect(result).toEqual(mockResponse);
		});

		it('should use custom schema when provided', async () => {
			const customSchema = z.object({
				adjustmentId: z.string(),
				balanceAfter: z.number(),
			});
			const mockResponse = {
				Id: '8a12865f9836b7d7019836f101057d47',
				Success: true,
			};
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			const body = JSON.stringify({
				Amount: 1,
				SourceTransactionNumber: 'XXX',
				Type: 'Increase',
			});

			const result = await applyCreditToAccountBalance(
				mockZuoraClient,
				body,
				customSchema,
			);

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/object/credit-balance-adjustment',
				body,
				customSchema,
			);
			expect(result).toEqual(mockResponse);
		});

		it('should maintain type safety with custom schemas', async () => {
			const strictSchema = z
				.object({
					adjustmentNumber: z.string(),
					status: z.literal('PROCESSED'),
					amount: z.number(),
				})
				.strict();

			const mockResponse = {
				adjustmentNumber: 'CBA-456',
				status: 'PROCESSED' as const,
				amount: 1,
			};
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			const body = JSON.stringify({
				Amount: 1,
				SourceTransactionNumber: 'XXX',
				Type: 'Increase',
			});

			const result = await applyCreditToAccountBalance(
				mockZuoraClient,
				body,
				strictSchema,
			);

			expect(result.adjustmentNumber).toBe('CBA-456');
			expect(result.status).toBe('PROCESSED');
			expect(result.amount).toBe(1);
		});
	});
});
