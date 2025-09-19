import {
	writeOffInvoice,
	getInvoice,
	getInvoiceItems,
	creditInvoice,
} from '@modules/zuora/invoice';
import {
	zuoraResponseSchema,
	getInvoiceSchema,
	getInvoiceItemsSchema,
	invoiceItemAdjustmentResultSchema,
	InvoiceItemAdjustmentType,
	InvoiceItemAdjustmentSourceType,
} from '@modules/zuora/types';
import { mockZuoraClient } from '../test/mocks/mockZuoraClient';
import { z } from 'zod';
import dayjs from 'dayjs';

jest.mock('@modules/zuora/zuoraClient');
jest.mock('dayjs', () => {
	const actualDayjs = jest.requireActual('dayjs');
	const mockedDayjs = () => ({
		format: jest.fn(() => '2023-11-04'),
	});
	mockedDayjs.tz = actualDayjs.tz;
	return mockedDayjs;
});

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
				getInvoiceSchema,
			);
			expect(result).toEqual(mockResponse);
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
				getInvoiceItemsSchema,
			);
			expect(result).toEqual(mockResponse);
		});
	});

	describe('creditInvoice', () => {
		it('should create invoice item adjustment', async () => {
			const mockResponse = { Success: true, Id: 'ADJ-123' };
			mockZuoraClient.post = jest.fn().mockResolvedValue(mockResponse);

			const adjustmentDate = dayjs('2023-11-04');
			const result = await creditInvoice(
				adjustmentDate,
				mockZuoraClient,
				'INV-123',
				'SRC-123',
				50.0,
				'Increase' as InvoiceItemAdjustmentType,
				'InvoiceDetail' as InvoiceItemAdjustmentSourceType,
				'Test adjustment',
				'REASON-01',
			);

			expect(mockZuoraClient.post).toHaveBeenCalledWith(
				'/v1/object/invoice-item-adjustment',
				expect.stringContaining('"Amount":50'),
				invoiceItemAdjustmentResultSchema,
			);
			expect(result).toEqual(mockResponse);
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
				zuoraResponseSchema,
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
				zuoraResponseSchema,
			);
		});

		it('should handle Zuora API errors', async () => {
			const error = new Error('Invoice not found');
			mockZuoraClient.put = jest.fn().mockRejectedValue(error);

			await expect(
				writeOffInvoice(mockZuoraClient, 'INV-12345', 'Test comment'),
			).rejects.toThrow('Invoice not found');
		});

		describe('dynamic typing', () => {
			it('should use default zuoraResponseSchema when no schema provided', async () => {
				const mockResponse = { success: true, code: 'SUCCESS' };
				mockZuoraClient.put = jest.fn().mockResolvedValue(mockResponse);

				const comment = 'Test write-off';
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
				mockZuoraClient.put = jest.fn().mockResolvedValue(mockResponse);

				const comment = 'Custom write-off';
				const result = await writeOffInvoice(
					mockZuoraClient,
					'INV-12345',
					comment,
					customSchema,
				);

				expect(mockZuoraClient.put).toHaveBeenCalledWith(
					'/v1/invoices/INV-12345/write-off',
					JSON.stringify({
						comment,
						memoDate: '2023-11-04',
						reasonCode: 'Write-off',
					}),
					customSchema,
				);
				expect(result).toEqual(mockResponse);
			});

			it('should maintain type safety with custom schemas', async () => {
				const strictSchema = z
					.object({
						writeOffId: z.string(),
						status: z.literal('COMPLETED'),
					})
					.strict();

				const mockResponse = {
					writeOffId: 'WO-123',
					status: 'COMPLETED' as const,
				};
				mockZuoraClient.put = jest.fn().mockResolvedValue(mockResponse);

				const comment = 'Strict write-off';
				const result = await writeOffInvoice(
					mockZuoraClient,
					'INV-12345',
					comment,
					strictSchema,
				);

				expect(result.writeOffId).toBe('WO-123');
				expect(result.status).toBe('COMPLETED');
			});
		});
	});
});
