import type { Logger } from '@modules/routing/logger';
import { isZuoraRequestSuccess } from '@modules/zuora/helpers';
import { rejectPayment } from '@modules/zuora/payment';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { rejectPaymentService } from '../../src/services/rejectPaymentService';

jest.mock('@modules/zuora/payment');
jest.mock('@modules/zuora/helpers');

describe('rejectPaymentService', () => {
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

	it('should reject payment successfully when payment number is provided', async () => {
		const mockResponse = { Success: true, Id: 'payment_123' };
		(rejectPayment as jest.Mock).mockResolvedValue(mockResponse);
		(isZuoraRequestSuccess as jest.Mock).mockReturnValue(true);

		const result = await rejectPaymentService(
			mockLogger,
			mockZuoraClient,
			'P-12345',
		);

		expect(result).toBe(true);
		expect(mockLogger.log).toHaveBeenCalledWith('Rejecting payment: P-12345');
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Payment rejection response:',
			JSON.stringify(mockResponse),
		);
		expect(rejectPayment).toHaveBeenCalledWith(
			mockZuoraClient,
			'P-12345',
			'chargeback',
		);
		expect(isZuoraRequestSuccess).toHaveBeenCalledWith(mockResponse);
	});

	it('should return false when payment number is undefined', async () => {
		const result = await rejectPaymentService(
			mockLogger,
			mockZuoraClient,
			undefined,
		);

		expect(result).toBe(false);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'No payment number found, skipping payment rejection',
		);
		expect(rejectPayment).not.toHaveBeenCalled();
	});

	it('should return false when payment number is empty string', async () => {
		const result = await rejectPaymentService(mockLogger, mockZuoraClient, '');

		expect(result).toBe(false);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'No payment number found, skipping payment rejection',
		);
		expect(rejectPayment).not.toHaveBeenCalled();
	});

	it('should throw error when payment rejection fails', async () => {
		const mockResponse = { Success: false, Errors: ['Payment not found'] };
		(rejectPayment as jest.Mock).mockResolvedValue(mockResponse);
		(isZuoraRequestSuccess as jest.Mock).mockReturnValue(false);

		await expect(
			rejectPaymentService(mockLogger, mockZuoraClient, 'P-12345'),
		).rejects.toThrow('Failed to reject payment in Zuora');

		expect(mockLogger.log).toHaveBeenCalledWith('Rejecting payment: P-12345');
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Payment rejection response:',
			JSON.stringify(mockResponse),
		);
		expect(isZuoraRequestSuccess).toHaveBeenCalledWith(mockResponse);
	});

	it('should handle different payment numbers', async () => {
		const mockResponse = { Success: true, Id: 'payment_456' };
		(rejectPayment as jest.Mock).mockResolvedValue(mockResponse);
		(isZuoraRequestSuccess as jest.Mock).mockReturnValue(true);

		const result = await rejectPaymentService(
			mockLogger,
			mockZuoraClient,
			'P-67890',
		);

		expect(result).toBe(true);
		expect(mockLogger.log).toHaveBeenCalledWith('Rejecting payment: P-67890');
		expect(rejectPayment).toHaveBeenCalledWith(
			mockZuoraClient,
			'P-67890',
			'chargeback',
		);
	});

	it('should propagate errors from rejectPayment API call', async () => {
		const error = new Error('Network error');
		(rejectPayment as jest.Mock).mockRejectedValue(error);

		await expect(
			rejectPaymentService(mockLogger, mockZuoraClient, 'P-12345'),
		).rejects.toThrow('Network error');

		expect(mockLogger.log).toHaveBeenCalledWith('Rejecting payment: P-12345');
		expect(isZuoraRequestSuccess).not.toHaveBeenCalled();
	});
});
