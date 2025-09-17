import type { Logger } from '@modules/routing/logger';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getSubscriptionService } from '../../src/services/getSubscriptionService';

jest.mock('@modules/zuora/subscription');

describe('getSubscriptionService', () => {
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

	it('should retrieve subscription successfully when subscription number is provided', async () => {
		const mockSubscription = {
			id: 'sub_123',
			subscriptionNumber: 'SUB-12345',
			status: 'Active',
			accountNumber: 'ACC-12345',
		};

		(getSubscription as jest.Mock).mockResolvedValue(mockSubscription);

		const result = await getSubscriptionService(
			mockLogger,
			mockZuoraClient,
			'SUB-12345',
		);

		expect(result).toEqual(mockSubscription);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Retrieved subscription number: SUB-12345',
		);
		expect(mockLogger.log).toHaveBeenCalledWith('Subscription status: Active');
		expect(getSubscription).toHaveBeenCalledWith(mockZuoraClient, 'SUB-12345');
	});

	it('should return null when subscription number is undefined', async () => {
		const result = await getSubscriptionService(
			mockLogger,
			mockZuoraClient,
			undefined,
		);

		expect(result).toBeNull();
		expect(mockLogger.log).toHaveBeenCalledWith(
			'No subscription found, skipping Zuora operations',
		);
		expect(getSubscription).not.toHaveBeenCalled();
	});

	it('should return null when subscription number is empty string', async () => {
		const result = await getSubscriptionService(
			mockLogger,
			mockZuoraClient,
			'',
		);

		expect(result).toBeNull();
		expect(mockLogger.log).toHaveBeenCalledWith(
			'No subscription found, skipping Zuora operations',
		);
		expect(getSubscription).not.toHaveBeenCalled();
	});

	it('should handle subscription with different status', async () => {
		const mockSubscription = {
			id: 'sub_456',
			subscriptionNumber: 'SUB-67890',
			status: 'Cancelled',
			accountNumber: 'ACC-67890',
		};

		(getSubscription as jest.Mock).mockResolvedValue(mockSubscription);

		const result = await getSubscriptionService(
			mockLogger,
			mockZuoraClient,
			'SUB-67890',
		);

		expect(result).toEqual(mockSubscription);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Subscription status: Cancelled',
		);
	});

	it('should propagate errors from getSubscription', async () => {
		const error = new Error('Zuora API error');
		(getSubscription as jest.Mock).mockRejectedValue(error);

		await expect(
			getSubscriptionService(mockLogger, mockZuoraClient, 'SUB-12345'),
		).rejects.toThrow('Zuora API error');

		expect(mockLogger.log).toHaveBeenCalledWith(
			'Retrieved subscription number: SUB-12345',
		);
	});
});
