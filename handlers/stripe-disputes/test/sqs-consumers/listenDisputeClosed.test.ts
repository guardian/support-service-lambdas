import type { Logger } from '@modules/routing/logger';
import type { ListenDisputeClosedRequestBody } from '../../src/dtos';
import { handleListenDisputeClosed } from '../../src/sqs-consumers/listenDisputeClosed';

const mockZuoraClient = {
	post: jest.fn(() => Promise.resolve({ success: true })),
	put: jest.fn(() => Promise.resolve({ success: true })),
};

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn(() => 'CODE'),
}));

jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: {
		create: jest.fn(() => Promise.resolve(mockZuoraClient)),
	},
}));

jest.mock('../../src/services/upsertSalesforceObject', () => ({
	upsertSalesforceObject: jest.fn(() =>
		Promise.resolve({ id: 'sf_123', success: true, errors: [] }),
	),
}));

jest.mock('../../src/services/zuoraGetInvoiceFromStripeChargeId', () => ({
	zuoraGetInvoiceFromStripeChargeId: jest.fn(() =>
		Promise.resolve({
			paymentId: 'ch_test456',
			paymentPaymentNumber: 'P-12345',
			InvoiceId: 'INV-12345',
			SubscriptionNumber: 'SUB-12345',
			paymentAccountId: 'acc_123',
		}),
	),
}));

jest.mock('../../src/services/getSubscriptionService', () => ({
	getSubscriptionService: jest.fn(() =>
		Promise.resolve({ status: 'Active', subscriptionNumber: 'SUB-12345' }),
	),
}));

jest.mock('../../src/services/rejectPaymentService', () => ({
	rejectPaymentService: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../src/services/writeOffInvoiceService', () => ({
	writeOffInvoiceService: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('../../src/services/cancelSubscriptionService', () => ({
	cancelSubscriptionService: jest.fn(() => Promise.resolve(true)),
}));

const mockLogger = {
	log: jest.fn(),
	error: jest.fn(),
	mutableAddContext: jest.fn(),
	resetContext: jest.fn(),
	getMessage: jest.fn(),
} as unknown as jest.Mocked<Logger>;

describe('handleListenDisputeClosed', () => {
	const mockWebhookData: ListenDisputeClosedRequestBody = {
		id: 'evt_test456',
		type: 'charge.dispute.closed',
		data: {
			object: {
				id: 'du_test456',
				charge: 'ch_test456',
				amount: 3000,
				currency: 'usd',
				reason: 'fraudulent',
				status: 'lost',
				created: 1699099200,
				is_charge_refundable: false,
				payment_intent: 'pi_test456',
				evidence_details: {
					due_by: 1699185600,
					has_evidence: true,
				},
				payment_method_details: {
					card: {
						network_reason_code: '4855',
					},
				},
			},
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('comprehensive dispute processing', () => {
		it('should process dispute closure with Zuora integration', async () => {
			// Get mocked services
			const mockGetSubscription = jest.mocked(
				require('../../src/services/getSubscriptionService')
					.getSubscriptionService,
			);
			const mockRejectPayment = jest.mocked(
				require('../../src/services/rejectPaymentService').rejectPaymentService,
			);
			const mockWriteOffInvoice = jest.mocked(
				require('../../src/services/writeOffInvoiceService')
					.writeOffInvoiceService,
			);
			const mockCancelSubscription = jest.mocked(
				require('../../src/services/cancelSubscriptionService')
					.cancelSubscriptionService,
			);

			const result = await handleListenDisputeClosed(
				mockLogger,
				mockWebhookData,
				'du_test456',
			);

			expect(result.success).toBe(true);

			// Verify subscription retrieval
			expect(mockGetSubscription).toHaveBeenCalledWith(
				mockLogger,
				mockZuoraClient,
				'SUB-12345',
			);

			// Verify payment rejection service call
			expect(mockRejectPayment).toHaveBeenCalledWith(
				mockLogger,
				mockZuoraClient,
				'P-12345',
			);

			// Verify invoice write-off service call
			expect(mockWriteOffInvoice).toHaveBeenCalledWith(
				mockLogger,
				mockZuoraClient,
				'INV-12345',
				'du_test456',
			);

			// Verify subscription cancellation
			expect(mockCancelSubscription).toHaveBeenCalledWith(
				mockLogger,
				mockZuoraClient,
				expect.objectContaining({
					status: 'Active',
					subscriptionNumber: 'SUB-12345',
				}),
			);
		});

		it('should handle processing successfully', async () => {
			const result = await handleListenDisputeClosed(
				mockLogger,
				mockWebhookData,
				'du_test456',
			);

			expect(result).toBeDefined();
			expect(result.success).toBe(true);
		});

		it('should throw error when Zuora operations fail', async () => {
			const mockRejectPayment = jest.mocked(
				require('../../src/services/rejectPaymentService').rejectPaymentService,
			);
			mockRejectPayment.mockRejectedValueOnce(
				new Error('Failed to reject payment in Zuora'),
			);

			await expect(
				handleListenDisputeClosed(mockLogger, mockWebhookData, 'du_test456'),
			).rejects.toThrow('Failed to reject payment in Zuora');

			expect(mockLogger.error).toHaveBeenCalledWith(
				'Error during Zuora operations:',
				expect.any(Error),
			);
		});

		it('should skip Zuora operations when no subscription', async () => {
			const mockGetSubscription = jest.mocked(
				require('../../src/services/getSubscriptionService')
					.getSubscriptionService,
			);
			const mockRejectPayment = jest.mocked(
				require('../../src/services/rejectPaymentService').rejectPaymentService,
			);

			mockGetSubscription.mockResolvedValueOnce(null);

			const result = await handleListenDisputeClosed(
				mockLogger,
				mockWebhookData,
				'du_test456',
			);

			expect(result.success).toBe(true);
			expect(mockRejectPayment).not.toHaveBeenCalled();
		});
	});
});
