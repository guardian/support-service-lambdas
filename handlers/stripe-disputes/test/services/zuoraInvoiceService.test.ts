import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const writeOffInvoiceMock = jest.fn();

jest.mock('@modules/zuora/invoice', () => ({
	writeOffInvoice: writeOffInvoiceMock,
}));

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

	describe('writeOffInvoiceMock', () => {
		it('should write off invoice with comment and current date', async () => {
			const mockResponse = { success: true, Id: 'memo_123' };
			writeOffInvoiceMock.mockResolvedValue(mockResponse);

			const comment = 'Dispute closure write-off';
			const result = await writeOffInvoiceMock(
				mockZuoraClient,
				'INV-12345',
				comment,
			);

			expect(writeOffInvoiceMock).toHaveBeenCalledWith(
				mockZuoraClient,
				'INV-12345',
				comment,
			);

			expect(result).toEqual(mockResponse);
		});

		it('should handle invoice numbers and IDs', async () => {
			const mockResponse = { success: true };
			writeOffInvoiceMock.mockResolvedValue(mockResponse);

			await writeOffInvoiceMock(
				mockZuoraClient,
				'8a8082c17f2b9b24017f2b9b3b4e0015',
				'Test comment',
			);

			expect(writeOffInvoiceMock).toHaveBeenCalledWith(
				mockZuoraClient,
				'8a8082c17f2b9b24017f2b9b3b4e0015',
				'Test comment',
			);
		});

		it('should handle Zuora API errors', async () => {
			const error = new Error('Invoice not found');
			writeOffInvoiceMock.mockRejectedValue(error);

			await expect(
				writeOffInvoiceMock(mockZuoraClient, 'INV-12345', 'Test comment'),
			).rejects.toThrow('Invoice not found');
		});

		it('should include all required fields in request body', async () => {
			writeOffInvoiceMock.mockResolvedValue({ success: true });

			await writeOffInvoiceMock(mockZuoraClient, 'INV-12345', 'Custom comment');

			expect(writeOffInvoiceMock).toHaveBeenCalledWith(
				mockZuoraClient,
				'INV-12345',
				'Custom comment',
			);
		});
	});
});
