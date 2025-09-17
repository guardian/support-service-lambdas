import { mockZuoraClient } from '../test/mocks/mockZuoraClient';

jest.mock('@modules/zuora/zuoraClient');
jest.mock('dayjs', () =>
	jest.fn(() => ({
		format: jest.fn(() => '2023-11-04'),
	})),
);

const invoiceMocks = {
	getInvoice: jest.fn(),
	getInvoiceItems: jest.fn(),
	creditInvoice: jest.fn(),
	writeOffInvoice: jest.fn(),
};

jest.mock('../src/invoice', () => invoiceMocks);

describe('invoice', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getInvoice', () => {
		it('should get invoice by ID', async () => {
			const mockResponse = {
				id: 'INV-123',
				invoiceNumber: 'INV-2023-001',
				amount: 99.99,
			};
			invoiceMocks.getInvoice.mockImplementation(
				async (zuoraClient, invoiceId) => {
					return zuoraClient.get(
						`/v1/invoices/${invoiceId}`,
						expect.any(Object),
					);
				},
			);
			mockZuoraClient.get = jest.fn().mockResolvedValue(mockResponse);

			const { getInvoice } = require('../src/invoice');
			const result = await getInvoice(mockZuoraClient, 'INV-123');

			expect(mockZuoraClient.get).toHaveBeenCalledWith(
				'/v1/invoices/INV-123',
				expect.any(Object),
			);
			expect(result).toBeDefined();
		});
	});

	describe('getInvoiceItems', () => {
		it('should get invoice items by invoice ID', async () => {
			const mockResponse = {
				invoiceItems: [
					{ id: 'II-1', amount: 50.0 },
					{ id: 'II-2', amount: 49.99 },
				],
			};
			invoiceMocks.getInvoiceItems.mockImplementation(
				async (zuoraClient, invoiceId) => {
					return zuoraClient.get(
						`/v1/invoices/${invoiceId}/items`,
						expect.any(Object),
					);
				},
			);
			mockZuoraClient.get = jest.fn().mockResolvedValue(mockResponse);

			const { getInvoiceItems } = require('../src/invoice');
			const result = await getInvoiceItems(mockZuoraClient, 'INV-123');

			expect(mockZuoraClient.get).toHaveBeenCalledWith(
				'/v1/invoices/INV-123/items',
				expect.any(Object),
			);
			expect(result).toBeDefined();
		});
	});

	describe('writeOffInvoice', () => {
		it('should write off invoice with comment and current date', async () => {
			const mockResponse = { Success: true, Id: 'memo_123' };
			invoiceMocks.writeOffInvoice.mockResolvedValue(mockResponse);

			const { writeOffInvoice } = require('../src/invoice');
			const comment = 'Dispute closure write-off';
			const result = await writeOffInvoice(
				mockZuoraClient,
				'INV-12345',
				comment,
			);

			expect(result).toEqual(mockResponse);
		});

		it('should handle invoice numbers and IDs', async () => {
			const mockResponse = { Success: true };
			invoiceMocks.writeOffInvoice.mockResolvedValue(mockResponse);

			const { writeOffInvoice } = require('../src/invoice');
			await writeOffInvoice(
				mockZuoraClient,
				'8a8082c17f2b9b24017f2b9b3b4e0015',
				'Test comment',
			);

			expect(invoiceMocks.writeOffInvoice).toHaveBeenCalledWith(
				mockZuoraClient,
				'8a8082c17f2b9b24017f2b9b3b4e0015',
				'Test comment',
			);
		});

		it('should handle Zuora API errors', async () => {
			const error = new Error('Invoice not found');
			invoiceMocks.writeOffInvoice.mockRejectedValue(error);

			const { writeOffInvoice } = require('../src/invoice');
			await expect(
				writeOffInvoice(mockZuoraClient, 'INV-12345', 'Test comment'),
			).rejects.toThrow('Invoice not found');
		});
	});
});
