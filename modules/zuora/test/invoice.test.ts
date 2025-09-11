import { mockZuoraClient } from '../test/mocks/mockZuoraClient';
import {
	getInvoice,
	getInvoiceItems,
	creditInvoice,
	writeOffInvoice,
} from '../src/invoice';
import type {
	InvoiceItemAdjustmentSourceType,
	InvoiceItemAdjustmentType,
} from '../src/types';
import dayjs from 'dayjs';

jest.mock('@modules/zuora/zuoraClient');
jest.mock('dayjs', () =>
	jest.fn(() => ({
		format: jest.fn(() => '2023-11-04'),
	})),
);

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
			mockZuoraClient.get = jest.fn().mockResolvedValue(mockResponse);

			const result = await getInvoice(mockZuoraClient, 'INV-123');

			expect(mockZuoraClient.get).toHaveBeenCalledWith(
				'/v1/invoices/INV-123',
				expect.any(Object),
			);
			expect(result).toEqual(mockResponse);
		});

		it('should handle API errors', async () => {
			const error = new Error('Invoice not found');
			mockZuoraClient.get = jest.fn().mockRejectedValue(error);

			await expect(getInvoice(mockZuoraClient, 'INV-123')).rejects.toThrow(
				'Invoice not found',
			);
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
			mockZuoraClient.get = jest.fn().mockResolvedValue(mockResponse);

			const result = await getInvoiceItems(mockZuoraClient, 'INV-123');

			expect(mockZuoraClient.get).toHaveBeenCalledWith(
				'/v1/invoices/INV-123/items',
				expect.any(Object),
			);
			expect(result).toEqual(mockResponse);
		});
	});

	describe('creditInvoice', () => {
		it('should create credit adjustment for invoice', async () => {
			const mockResponse = {
				Success: true,
				Id: 'adj_123',
			};
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);
			const adjustmentDate = dayjs('2023-11-04');

			const result = await creditInvoice(
				adjustmentDate,
				mockZuoraClient,
				'INV-123',
				'source_123',
				-50.0,
				'Credit' as InvoiceItemAdjustmentType,
				'InvoiceDetail' as InvoiceItemAdjustmentSourceType,
				'Credit adjustment',
				'CREDIT001',
			);

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/object/invoice-item-adjustment',
				expect.stringContaining('"AdjustmentDate":"2023-11-04"'),
				expect.any(Object),
			);
			expect(result).toEqual(mockResponse);
		});

		it('should use default comment when not provided', async () => {
			const mockResponse = { Success: true, Id: 'adj_124' };
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);
			const adjustmentDate = dayjs('2023-11-04');

			await creditInvoice(
				adjustmentDate,
				mockZuoraClient,
				'INV-123',
				'source_123',
				-25.0,
				'Credit' as InvoiceItemAdjustmentType,
				'InvoiceDetail' as InvoiceItemAdjustmentSourceType,
			);

			const callArgs = (mockZuoraClient.post as jest.Mock).mock.calls[0];
			const requestBody = JSON.parse(callArgs[1] as string);

			expect(requestBody.Comment).toBe('Created by support-service-lambdas');
		});
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