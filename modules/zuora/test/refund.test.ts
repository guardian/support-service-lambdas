import { doRefund } from '@modules/zuora/refund';
import { zuoraResponseSchema } from '@modules/zuora/types/zuoraClient';
import { mockZuoraClient } from '../test/mocks/mockZuoraClient';

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

		expect(mockZuoraClient.post).toHaveBeenCalledWith(
			'/v1/object/refund',
			body,
			zuoraResponseSchema,
		);
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

		await expect(
			doRefund(mockZuoraClient, body, zuoraResponseSchema),
		).rejects.toThrow('Refund failed');
	});
});
