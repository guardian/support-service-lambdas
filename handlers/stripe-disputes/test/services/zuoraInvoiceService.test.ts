import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { writeOffInvoice } from '../../src/services/zuoraInvoiceService';

jest.mock('dayjs', () =>
	jest.fn(() => ({
		format: jest.fn(() => '2023-11-04'),
	})),
);

describe('ZuoraInvoiceService', () => {
	const mockZuoraClient = {
		put: jest.fn(),
	} as unknown as ZuoraClient;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('writeOffInvoice', () => {
		it('should write off invoice with comment and current date', async () => {
			const mockResponse = { Success: true, Id: 'memo_123' };
			mockZuoraClient.put = jest.fn().mockResolvedValue(mockResponse);

			const comment = 'Dispute closure write-off';
			const result = await writeOffInvoice(
				mockZuoraClient,
				'INV-12345',
				comment,
			);

			expect(mockZuoraClient.put).toHaveBeenCalledWith(
				'/v1/invoices/INV-12345/write-off',
				JSON.stringify({
					comment,
					memoDate: '2023-11-04',
					reasonCode: 'Write-off',
				}),
				expect.any(Object),
			);

			expect(result).toEqual(mockResponse);
		});

		it('should handle invoice numbers and IDs', async () => {
			const mockResponse = { Success: true };
			mockZuoraClient.put = jest.fn().mockResolvedValue(mockResponse);

			await writeOffInvoice(
				mockZuoraClient,
				'8a8082c17f2b9b24017f2b9b3b4e0015',
				'Test comment',
			);

			expect(mockZuoraClient.put).toHaveBeenCalledWith(
				'/v1/invoices/8a8082c17f2b9b24017f2b9b3b4e0015/write-off',
				expect.any(String),
				expect.any(Object),
			);
		});

		it('should handle Zuora API errors', async () => {
			const error = new Error('Invoice not found');
			mockZuoraClient.put = jest.fn().mockRejectedValue(error);

			await expect(
				writeOffInvoice(mockZuoraClient, 'INV-12345', 'Test comment'),
			).rejects.toThrow('Invoice not found');
		});

		it('should include all required fields in request body', async () => {
			mockZuoraClient.put = jest.fn().mockResolvedValue({ Success: true });

			await writeOffInvoice(mockZuoraClient, 'INV-12345', 'Custom comment');

			const callArgs = (mockZuoraClient.put as jest.Mock).mock.calls[0];
			const requestBody = JSON.parse(callArgs[1] as string);

			expect(requestBody).toHaveProperty('comment', 'Custom comment');
			expect(requestBody).toHaveProperty('memoDate', '2023-11-04');
			expect(requestBody).toHaveProperty('reasonCode', 'Write-off');
		});
	});
});
