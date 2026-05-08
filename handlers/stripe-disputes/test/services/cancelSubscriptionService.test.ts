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
		status: 'Active' | 'Cancelled',
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
		(cancelSubscription as jest.Mock).mockResolvedValue({
			invoiceId: 'INV-NEG-001',
		});
	});

	it('should cancel active subscription with SpecificDate policy and runBilling=true', async () => {
		const mockSubscription = createMockSubscription('Active');

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result).toEqual({
			cancelled: true,
			negativeInvoiceId: 'INV-NEG-001',
		});
		expect(cancelSubscription).toHaveBeenCalledWith(
			mockZuoraClient,
			'SUB-12345',
			expect.objectContaining({ format: expect.any(Function) }),
			true,
		);
	});

	it('should skip cancellation for inactive subscription', async () => {
		const mockSubscription = createMockSubscription('Cancelled');

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result).toEqual({ cancelled: false });
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Subscription already inactive (Cancelled), skipping cancellation',
		);
		expect(cancelSubscription).not.toHaveBeenCalled();
	});

	it('should return negativeInvoiceId from cancel response', async () => {
		const mockSubscription = createMockSubscription('Active');
		(cancelSubscription as jest.Mock).mockResolvedValue({
			invoiceId: 'INV-NEG-789',
		});

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result.negativeInvoiceId).toBe('INV-NEG-789');
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Cancellation generated negative invoice: INV-NEG-789',
		);
	});

	it('should handle cancel response without invoiceId', async () => {
		const mockSubscription = createMockSubscription('Active');
		(cancelSubscription as jest.Mock).mockResolvedValue({});

		const result = await cancelSubscriptionService(
			mockLogger,
			mockZuoraClient,
			mockSubscription,
		);

		expect(result).toEqual({ cancelled: true, negativeInvoiceId: undefined });
	});

	it('should propagate errors when ZuoraClient throws', async () => {
		const mockSubscription = createMockSubscription('Active');
		const error = new Error('Zuora API error: Subscription not found');
		(cancelSubscription as jest.Mock).mockRejectedValue(error);

		await expect(
			cancelSubscriptionService(mockLogger, mockZuoraClient, mockSubscription),
		).rejects.toThrow('Zuora API error: Subscription not found');
	});

	describe('email sending', () => {
		it('should send email when subscription is cancelled', async () => {
			const mockSubscription = createMockSubscription('Active');
			(sendEmail as jest.Mock).mockResolvedValue({ MessageId: 'msg_123' });

			const result = await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			expect(result.cancelled).toBe(true);
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
		});

		it('should still return cancelled=true when no email address exists', async () => {
			const mockSubscription = createMockSubscription('Active');
			(getAccount as jest.Mock).mockResolvedValue({
				billToContact: {},
				accountNumber: 'ACC-12345',
				basicInfo: { identityId: 'identity-123' },
			});

			const result = await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			expect(result.cancelled).toBe(true);
			expect(sendEmail).not.toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'No email address found for subscription SUB-12345',
			);
		});

		it('should not throw when email sending fails', async () => {
			const mockSubscription = createMockSubscription('Active');
			(sendEmail as jest.Mock).mockRejectedValue(new Error('SQS error'));

			const result = await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			expect(result.cancelled).toBe(true);
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to send dispute cancellation email:',
				expect.any(Error),
			);
		});

		it('should not throw when getAccount fails', async () => {
			const mockSubscription = createMockSubscription('Active');
			(getAccount as jest.Mock).mockRejectedValue(
				new Error('Zod validation failed'),
			);

			const result = await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			expect(result.cancelled).toBe(true);
			expect(sendEmail).not.toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to send dispute cancellation email:',
				expect.any(Error),
			);
		});

		it('should not send email for inactive subscriptions', async () => {
			const mockSubscription = createMockSubscription('Cancelled');

			await cancelSubscriptionService(
				mockLogger,
				mockZuoraClient,
				mockSubscription,
			);

			expect(sendEmail).not.toHaveBeenCalled();
		});
	});
});
