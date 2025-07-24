import { doRefund } from '@modules/zuora/refund';
import { zuoraResponseSchema } from '@modules/zuora/types';
import { mockZuoraClient } from '../test/mocks/mockZuoraClient';
import { z } from 'zod';

jest.mock('@modules/zuora/zuoraClient');

describe('doRefund', () => {
	it('should process a successful refund', async () => {
		const mockResponse = { Success: true };
		mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

		const body = JSON.stringify({
			Amount: 10,
			SourceTransactionNumber: 'REFUND123',
			Type: 'Refund',
		});

		const result = await doRefund(mockZuoraClient, body, zuoraResponseSchema);
		expect(result).toEqual(mockResponse);
	});

	it('should throw if zuoraClient.post rejects', async () => {
		const error = new Error('Refund failed');
		mockZuoraClient.post = jest.fn().mockRejectedValue(error);

		const body = JSON.stringify({
			Amount: 10,
			SourceTransactionNumber: 'REFUND123',
			Type: 'Refund',
		});

		await expect(doRefund(mockZuoraClient, body)).rejects.toThrow(
			'Refund failed',
		);
	});

	describe('dynamic typing', () => {
		it('should use default zuoraResponseSchema when no schema provided', async () => {
			const mockResponse = { success: true, code: 'SUCCESS' };
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			const body = JSON.stringify({
				Amount: 10,
				SourceTransactionNumber: 'REFUND123',
				Type: 'Refund',
			});

			const result = await doRefund(mockZuoraClient, body);

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/object/refund',
				body,
				zuoraResponseSchema,
			);
			expect(result).toEqual(mockResponse);
		});

		it('should use custom schema when provided', async () => {
			const customSchema = z.object({
				customField: z.string(),
				amount: z.number(),
			});
			const mockResponse = { customField: 'test', amount: 10 };
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			const body = JSON.stringify({
				Amount: 10,
				SourceTransactionNumber: 'REFUND123',
				Type: 'Refund',
			});

			const result = await doRefund(mockZuoraClient, body, customSchema);

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/object/refund',
				body,
				customSchema,
			);
			expect(result).toEqual(mockResponse);
		});

		it('should maintain type safety with custom schemas', async () => {
			const strictSchema = z
				.object({
					refundId: z.string(),
					status: z.literal('COMPLETED'),
				})
				.strict();

			const mockResponse = {
				refundId: 'REF-123',
				status: 'COMPLETED' as const,
			};
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			const body = JSON.stringify({
				Amount: 10,
				SourceTransactionNumber: 'REFUND123',
				Type: 'Refund',
			});

			const result = await doRefund(mockZuoraClient, body, strictSchema);

			expect(result.refundId).toBe('REF-123');
			expect(result.status).toBe('COMPLETED');
		});
	});
});
