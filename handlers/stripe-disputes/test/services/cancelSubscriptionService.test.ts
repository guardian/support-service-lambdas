import { sendEmail } from '@modules/email/email';
import type { Logger } from '@modules/routing/logger';
import { stageFromEnvironment } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import { cancelSubscription } from '@modules/zuora/subscription';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { cancelSubscriptionService } from '../../src/services/cancelSubscriptionService';

jest.mock('@modules/zuora/account');
jest.mock('@modules/zuora/subscription');
jest.mock('@modules/email/email');
jest.mock('@modules/stage');
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

	const mockAccount = {
		billToContact: {
			workEmail: 'customer@example.com',
			firstName: 'John',
			lastName: 'Doe',
		},
		accountNumber: 'ACC-12345',
		basicInfo: {
			identityId: 'identity-123',
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(stageFromEnvironment as jest.Mock).mockReturnValue('TEST');
		(getAccount as jest.Mock).mockResolvedValue(mockAccount);
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

	it('should propagate errors when ZuoraClient throws', async () => {
		const mockSubscription = createMockSubscription('Active');
		const error = new Error('Zuora API error: Subscription not found');
		(cancelSubscription as jest.Mock).mockRejectedValue(error);

		await expect(
			cancelSubscriptionService(mockLogger, mockZuoraClient, mockSubscription),
		).rejects.toThrow('Zuora API error: Subscription not found');

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

	describe('email sending', () => {
		it('should send email when subscription is cancelled', async () => {
			const mockSubscription = createMockSubscription('Active');
			const mockCancelResponse = { Success: true, Id: 'cancel_123' };

			(cancelSubscription as jest.Mock).mockResolvedValue(mockCancelResponse);
			(sendEmail as jest.Mock).mockResolvedValue({ MessageId: 'msg_123' });

			const result = await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			expect(result).toBe(true);
			expect(sendEmail).toHaveBeenCalledWith(
				'TEST',
				expect.objectContaining({
					To: {
						Address: 'customer@example.com',
						ContactAttributes: {
							SubscriberAttributes: {
								EmailAddress: 'customer@example.com',
								SubscriptionNumber: 'SUB-12345',
								DisputeCreatedDate: '2023-11-04',
							},
						},
					},
					DataExtensionName: 'stripe-dispute-cancellation',
					IdentityUserId: 'identity-123',
				}),
				expect.any(Function),
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Sending dispute cancellation email to customer: customer@example.com',
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Dispute cancellation email sent successfully',
			);
		});

		it('should return false when no email address exists', async () => {
			const mockSubscription = createMockSubscription('Active');
			const mockCancelResponse = { Success: true, Id: 'cancel_123' };

			(cancelSubscription as jest.Mock).mockResolvedValue(mockCancelResponse);
			(getAccount as jest.Mock).mockResolvedValue({
				billToContact: {
					firstName: 'John',
					lastName: 'Doe',
					// No workEmail
				},
				accountNumber: 'ACC-12345',
				basicInfo: {
					identityId: 'identity-123',
				},
			});

			const result = await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			expect(result).toBe(false); // Changed to false
			expect(sendEmail).not.toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'No email address found for subscription SUB-12345',
			);
			// Verify it only logs the error once (early return)
			expect(mockLogger.error).toHaveBeenCalledTimes(1);
		});

		it('should return false when billToContact has no workEmail field', async () => {
			const mockSubscription = createMockSubscription('Active');
			const mockCancelResponse = { Success: true, Id: 'cancel_123' };

			(cancelSubscription as jest.Mock).mockResolvedValue(mockCancelResponse);
			(getAccount as jest.Mock).mockResolvedValue({
				billToContact: {
					// billToContact exists but has no workEmail field
				},
				accountNumber: 'ACC-12345',
				basicInfo: {
					identityId: 'identity-123',
				},
			});

			const result = await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			// Should return false because no email means we can't notify customer
			expect(result).toBe(false);
			// Should not attempt to send email
			expect(sendEmail).not.toHaveBeenCalled();
			// Should log error about missing email
			expect(mockLogger.error).toHaveBeenCalledWith(
				'No email address found for subscription SUB-12345',
			);
			// Should still log cancellation success messages (cancellation happened, but we return false)
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Canceling active subscription: SUB-12345',
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Subscription cancellation response:',
				JSON.stringify(mockCancelResponse),
			);
		});

		it('should not throw when email sending fails', async () => {
			const mockSubscription = createMockSubscription('Active');
			const mockCancelResponse = { Success: true, Id: 'cancel_123' };

			(cancelSubscription as jest.Mock).mockResolvedValue(mockCancelResponse);
			(sendEmail as jest.Mock).mockRejectedValue(new Error('SQS error'));

			const result = await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			expect(result).toBe(true); // Still returns true since cancellation succeeded
			expect(sendEmail).toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to send dispute cancellation email:',
				expect.any(Error),
			);
		});

		it('should not send email for inactive subscriptions', async () => {
			const mockSubscription = createMockSubscription('Cancelled');

			const result = await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			expect(result).toBe(false);
			expect(sendEmail).not.toHaveBeenCalled();
			expect(mockLogger.log).toHaveBeenCalledWith(
				'Subscription already inactive (Cancelled), skipping cancellation',
			);
		});
	});
});
