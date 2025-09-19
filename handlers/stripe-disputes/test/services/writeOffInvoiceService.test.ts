import type { Logger } from '@modules/routing/logger';
import { isZuoraRequestSuccess } from '@modules/zuora/helpers';
import { writeOffInvoice } from '@modules/zuora/invoice';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { writeOffInvoiceService } from '../../src/services/writeOffInvoiceService';

jest.mock('@modules/zuora/invoice');
jest.mock('@modules/zuora/helpers');

describe('writeOffInvoiceService', () => {
	const mockLogger = {
		log: jest.fn(),
		error: jest.fn(),
		mutableAddContext: jest.fn(),
		resetContext: jest.fn(),
		getMessage: jest.fn(),
	} as unknown as jest.Mocked<Logger>;

	const mockZuoraClient = {} as ZuoraClient;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should write off invoice successfully when invoice ID is provided', async () => {
		const mockResponse = { Success: true, Id: 'writeoff_123' };
		(writeOffInvoice as jest.Mock).mockResolvedValue(mockResponse);
		(isZuoraRequestSuccess as jest.Mock).mockReturnValue(true);

		const result = await writeOffInvoiceService(
			mockLogger,
			mockZuoraClient,
			'INV-12345',
			'du_test456',
		);

		expect(result).toBe(true);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Writing off invoice: INV-12345',
		);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Invoice write-off response:',
			JSON.stringify(mockResponse),
		);
		expect(writeOffInvoice).toHaveBeenCalledWith(
			mockZuoraClient,
			'INV-12345',
			'Invoice write-off due to Stripe dispute closure. Dispute ID: du_test456',
		);
		expect(isZuoraRequestSuccess).toHaveBeenCalledWith(mockResponse);
	});

	it('should return false when invoice ID is undefined', async () => {
		const result = await writeOffInvoiceService(
			mockLogger,
			mockZuoraClient,
			undefined,
			'du_test456',
		);

		expect(result).toBe(false);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'No invoice ID found, skipping invoice write-off',
		);
		expect(writeOffInvoice).not.toHaveBeenCalled();
	});

	it('should return false when invoice ID is empty string', async () => {
		const result = await writeOffInvoiceService(
			mockLogger,
			mockZuoraClient,
			'',
			'du_test456',
		);

		expect(result).toBe(false);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'No invoice ID found, skipping invoice write-off',
		);
		expect(writeOffInvoice).not.toHaveBeenCalled();
	});

	it('should throw error when invoice write-off fails', async () => {
		const mockResponse = { Success: false, Errors: ['Invoice not found'] };
		(writeOffInvoice as jest.Mock).mockResolvedValue(mockResponse);
		(isZuoraRequestSuccess as jest.Mock).mockReturnValue(false);

		await expect(
			writeOffInvoiceService(
				mockLogger,
				mockZuoraClient,
				'INV-12345',
				'du_test456',
			),
		).rejects.toThrow('Failed to write off invoice in Zuora');

		expect(mockLogger.log).toHaveBeenCalledWith(
			'Writing off invoice: INV-12345',
		);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Invoice write-off response:',
			JSON.stringify(mockResponse),
		);
		expect(isZuoraRequestSuccess).toHaveBeenCalledWith(mockResponse);
	});

	it('should handle different dispute IDs in comment', async () => {
		const mockResponse = { Success: true, Id: 'writeoff_456' };
		(writeOffInvoice as jest.Mock).mockResolvedValue(mockResponse);
		(isZuoraRequestSuccess as jest.Mock).mockReturnValue(true);

		const result = await writeOffInvoiceService(
			mockLogger,
			mockZuoraClient,
			'INV-67890',
			'du_test789',
		);

		expect(result).toBe(true);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Writing off invoice: INV-67890',
		);
		expect(writeOffInvoice).toHaveBeenCalledWith(
			mockZuoraClient,
			'INV-67890',
			'Invoice write-off due to Stripe dispute closure. Dispute ID: du_test789',
		);
	});

	it('should propagate errors from writeOffInvoice API call', async () => {
		const error = new Error('Network error');
		(writeOffInvoice as jest.Mock).mockRejectedValue(error);

		await expect(
			writeOffInvoiceService(
				mockLogger,
				mockZuoraClient,
				'INV-12345',
				'du_test456',
			),
		).rejects.toThrow('Network error');

		expect(mockLogger.log).toHaveBeenCalledWith(
			'Writing off invoice: INV-12345',
		);
		expect(isZuoraRequestSuccess).not.toHaveBeenCalled();
	});

	it('should handle invoice IDs with special characters', async () => {
		const mockResponse = { Success: true, Id: 'writeoff_789' };
		(writeOffInvoice as jest.Mock).mockResolvedValue(mockResponse);
		(isZuoraRequestSuccess as jest.Mock).mockReturnValue(true);

		const result = await writeOffInvoiceService(
			mockLogger,
			mockZuoraClient,
			'8a8082c17f2b9b24017f2b9b3b4e0015',
			'du_test456',
		);

		expect(result).toBe(true);
		expect(writeOffInvoice).toHaveBeenCalledWith(
			mockZuoraClient,
			'8a8082c17f2b9b24017f2b9b3b4e0015',
			'Invoice write-off due to Stripe dispute closure. Dispute ID: du_test456',
		);
	});
});
