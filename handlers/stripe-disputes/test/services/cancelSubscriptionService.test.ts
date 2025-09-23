import type { Logger } from '@modules/routing/logger';
import { cancelSubscription } from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { cancelSubscriptionService } from '../../src/services/cancelSubscriptionService';

jest.mock('@modules/zuora/subscription');
jest.mock('dayjs', () =>
	jest.fn(() => ({
		format: jest.fn(() => '2023-11-04'),
	})),
);

describe('cancelSubscriptionService', () => {
	const mockLogger = {
		log: jest.fn(),
		error: jest.fn(),
		mutableAddContext: jest.fn(),
		resetContext: jest.fn(),
		getMessage: jest.fn(),
	} as unknown as jest.Mocked<Logger>;

	const mockZuoraClient = {} as ZuoraClient;

	const createMockSubscription = (
		status: string,
		subscriptionNumber = 'SUB-12345',
	): ZuoraSubscription => ({
		id: 'sub_123',
		subscriptionNumber,
		status,
		accountNumber: 'ACC-12345',
		contractEffectiveDate: new Date('2023-01-01'),
		serviceActivationDate: new Date('2023-01-01'),
		customerAcceptanceDate: new Date('2023-01-01'),
		subscriptionStartDate: new Date('2023-01-01'),
		subscriptionEndDate: new Date('2024-01-01'),
		lastBookingDate: new Date('2023-10-01'),
		termStartDate: new Date('2023-01-01'),
		termEndDate: new Date('2024-01-01'),
		ratePlans: [],
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should cancel active subscription successfully', async () => {
		const mockSubscription = createMockSubscription('Active');
		const mockCancelResponse = { Success: true, Id: 'cancel_123' };
		(cancelSubscription as jest.Mock).mockResolvedValue(mockCancelResponse);

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result).toBe(true);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Canceling active subscription: SUB-12345',
		);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Subscription cancellation response:',
			JSON.stringify(mockCancelResponse),
		);
		expect(cancelSubscription).toHaveBeenCalledWith(
			mockZuoraClient,
			'SUB-12345',
			expect.objectContaining({ format: expect.any(Function) }),
			false,
			undefined,
			'EndOfLastInvoicePeriod',
		);
	});

	it('should skip cancellation for inactive subscription (Cancelled)', async () => {
		const mockSubscription = createMockSubscription('Cancelled');

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result).toBe(false);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Subscription already inactive (Cancelled), skipping cancellation',
		);
		expect(cancelSubscription).not.toHaveBeenCalled();
	});

	it('should skip cancellation for inactive subscription (Expired)', async () => {
		const mockSubscription = createMockSubscription('Expired');

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result).toBe(false);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Subscription already inactive (Expired), skipping cancellation',
		);
		expect(cancelSubscription).not.toHaveBeenCalled();
	});

	it('should skip cancellation for inactive subscription (Suspended)', async () => {
		const mockSubscription = createMockSubscription('Suspended');

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result).toBe(false);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Subscription already inactive (Suspended), skipping cancellation',
		);
		expect(cancelSubscription).not.toHaveBeenCalled();
	});

	it('should still return true even when Zuora response indicates failure', async () => {
		const mockSubscription = createMockSubscription('Active');
		const mockCancelResponse = {
			Success: false,
			Errors: ['Cannot cancel subscription'],
		};
		(cancelSubscription as jest.Mock).mockResolvedValue(mockCancelResponse);

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result).toBe(true);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Canceling active subscription: SUB-12345',
		);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Subscription cancellation response:',
			JSON.stringify(mockCancelResponse),
		);
	});

	it('should handle different subscription numbers', async () => {
		const mockSubscription = createMockSubscription('Active', 'SUB-67890');
		const mockCancelResponse = { Success: true, Id: 'cancel_456' };
		(cancelSubscription as jest.Mock).mockResolvedValue(mockCancelResponse);

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result).toBe(true);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Canceling active subscription: SUB-67890',
		);
		expect(cancelSubscription).toHaveBeenCalledWith(
			mockZuoraClient,
			'SUB-67890',
			expect.objectContaining({ format: expect.any(Function) }),
			false,
			undefined,
			'EndOfLastInvoicePeriod',
		);
	});

	it('should propagate errors from cancelSubscription API call', async () => {
		const mockSubscription = createMockSubscription('Active');
		const error = new Error('Network error');
		(cancelSubscription as jest.Mock).mockRejectedValue(error);

		await expect(
			cancelSubscriptionService(mockLogger, mockZuoraClient, mockSubscription),
		).rejects.toThrow('Network error');

		expect(mockLogger.log).toHaveBeenCalledWith(
			'Canceling active subscription: SUB-12345',
		);
	});

	it('should use correct cancellation policy', async () => {
		const mockSubscription = createMockSubscription('Active');
		const mockCancelResponse = { Success: true, Id: 'cancel_789' };
		(cancelSubscription as jest.Mock).mockResolvedValue(mockCancelResponse);

		await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		const cancelCall = (cancelSubscription as jest.Mock).mock.calls[0];
		expect(cancelCall[5]).toBe('EndOfLastInvoicePeriod');
	});
});
