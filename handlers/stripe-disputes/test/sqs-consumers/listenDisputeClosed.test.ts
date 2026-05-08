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
	cancelSubscriptionService: jest.fn(() =>
		Promise.resolve({ cancelled: true, negativeInvoiceId: 'INV-NEG-001' }),
	),
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

	it('should process dispute closure in the correct order', async () => {
		const mockCancelSubscription = jest.mocked(
			require('../../src/services/cancelSubscriptionService')
				.cancelSubscriptionService,
		);
		const mockRejectPayment = jest.mocked(
			require('../../src/services/rejectPaymentService').rejectPaymentService,
		);
		const mockWriteOffInvoice = jest.mocked(
			require('../../src/services/writeOffInvoiceService')
				.writeOffInvoiceService,
		);

		const callOrder: string[] = [];
		mockCancelSubscription.mockImplementation(() => {
			callOrder.push('cancel');
			return Promise.resolve({
				cancelled: true,
				negativeInvoiceId: 'INV-NEG-001',
			});
		});
		mockRejectPayment.mockImplementation(() => {
			callOrder.push('reject');
			return Promise.resolve(true);
		});
		mockWriteOffInvoice.mockImplementation(() => {
			callOrder.push('writeOff');
			return Promise.resolve(true);
		});

		await handleListenDisputeClosed(mockLogger, mockWebhookData, 'du_test456');

		// New order: cancel -> reject -> writeOff (disputed) -> writeOff (negative)
		expect(callOrder).toEqual(['cancel', 'reject', 'writeOff', 'writeOff']);
	});

	it('should process dispute closure with all Zuora operations', async () => {
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

		expect(result).not.toBeNull();
		expect(result!.success).toBe(true);

		expect(mockGetSubscription).toHaveBeenCalledWith(
			mockLogger,
			mockZuoraClient,
			'SUB-12345',
		);

		expect(mockCancelSubscription).toHaveBeenCalledWith(
			mockLogger,
			mockZuoraClient,
			expect.objectContaining({
				status: 'Active',
				subscriptionNumber: 'SUB-12345',
			}),
		);

		expect(mockRejectPayment).toHaveBeenCalledWith(
			mockLogger,
			mockZuoraClient,
			'P-12345',
		);

		// Disputed invoice write-off
		expect(mockWriteOffInvoice).toHaveBeenCalledWith(
			mockLogger,
			mockZuoraClient,
			'INV-12345',
			'du_test456',
		);

		// Negative invoice write-off (with custom comment)
		expect(mockWriteOffInvoice).toHaveBeenCalledWith(
			mockLogger,
			mockZuoraClient,
			'INV-NEG-001',
			'du_test456',
			'Negative invoice write-off due to Stripe dispute cancellation',
		);
	});

	it('should skip negative invoice write-off when no negative invoice', async () => {
		const mockCancelSubscription = jest.mocked(
			require('../../src/services/cancelSubscriptionService')
				.cancelSubscriptionService,
		);
		const mockWriteOffInvoice = jest.mocked(
			require('../../src/services/writeOffInvoiceService')
				.writeOffInvoiceService,
		);

		mockCancelSubscription.mockResolvedValueOnce({
			cancelled: true,
			negativeInvoiceId: undefined,
		});

		await handleListenDisputeClosed(mockLogger, mockWebhookData, 'du_test456');

		// Only one write-off call (disputed invoice), not two
		expect(mockWriteOffInvoice).toHaveBeenCalledTimes(1);
		expect(mockWriteOffInvoice).toHaveBeenCalledWith(
			mockLogger,
			mockZuoraClient,
			'INV-12345',
			'du_test456',
		);
	});

	it('should not throw when negative invoice write-off fails', async () => {
		const mockWriteOffInvoice = jest.mocked(
			require('../../src/services/writeOffInvoiceService')
				.writeOffInvoiceService,
		);

		let writeOffCallCount = 0;
		mockWriteOffInvoice.mockImplementation(() => {
			writeOffCallCount++;
			if (writeOffCallCount === 2) {
				return Promise.reject(new Error('Write-off failed'));
			}
			return Promise.resolve(true);
		});

		const result = await handleListenDisputeClosed(
			mockLogger,
			mockWebhookData,
			'du_test456',
		);

		expect(result).not.toBeNull();
		expect(result!.success).toBe(true);
		expect(mockLogger.error).toHaveBeenCalledWith(
			'Failed to write off negative invoice:',
			expect.any(Error),
		);
	});

	it('should throw error when reject payment fails with non-66000030 error', async () => {
		const mockRejectPayment = jest.mocked(
			require('../../src/services/rejectPaymentService').rejectPaymentService,
		);
		mockRejectPayment.mockRejectedValueOnce(
			new Error('Failed to reject payment in Zuora'),
		);

		await expect(
			handleListenDisputeClosed(mockLogger, mockWebhookData, 'du_test456'),
		).rejects.toThrow('Failed to reject payment in Zuora');
	});

	it('should skip invoice write-off when payment already processed (error 66000030)', async () => {
		const { ZuoraError } = require('@modules/zuora/errors');

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

		const zuoraError = new ZuoraError(
			'Transaction already processed',
			{ status: 200, responseBody: '', responseHeaders: {} },
			[
				{
					code: '66000030',
					message:
						'Another transaction has already been entered for this transaction',
				},
			],
		);

		mockRejectPayment.mockRejectedValueOnce(zuoraError);

		const result = await handleListenDisputeClosed(
			mockLogger,
			mockWebhookData,
			'du_test456',
		);

		expect(result).not.toBeNull();
		expect(result!.success).toBe(true);
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Payment already processed (likely refunded before dispute). Skipping invoice write-off.',
		);
		// Disputed invoice should NOT be written off
		expect(mockWriteOffInvoice).not.toHaveBeenCalledWith(
			mockLogger,
			mockZuoraClient,
			'INV-12345',
			'du_test456',
		);
		// Cancel should still have been called (before reject)
		expect(mockCancelSubscription).toHaveBeenCalled();
	});

	it('should skip Zuora operations when no subscription', async () => {
		const mockGetSubscription = jest.mocked(
			require('../../src/services/getSubscriptionService')
				.getSubscriptionService,
		);
		const mockRejectPayment = jest.mocked(
			require('../../src/services/rejectPaymentService').rejectPaymentService,
		);
		const mockCancelSubscription = jest.mocked(
			require('../../src/services/cancelSubscriptionService')
				.cancelSubscriptionService,
		);

		mockGetSubscription.mockResolvedValueOnce(null);

		const result = await handleListenDisputeClosed(
			mockLogger,
			mockWebhookData,
			'du_test456',
		);

		expect(result).not.toBeNull();
		expect(result!.success).toBe(true);
		expect(mockRejectPayment).not.toHaveBeenCalled();
		expect(mockCancelSubscription).not.toHaveBeenCalled();
	});

	it('should skip processing SEPA disputes without payment_method_details', async () => {
		const sepaWebhookData: ListenDisputeClosedRequestBody = {
			...mockWebhookData,
			data: {
				object: {
					...mockWebhookData.data.object,
					payment_method_details: undefined as any,
				},
			},
		};

		const mockGetSubscription = jest.mocked(
			require('../../src/services/getSubscriptionService')
				.getSubscriptionService,
		);

		const result = await handleListenDisputeClosed(
			mockLogger,
			sepaWebhookData,
			'du_test456',
		);

		expect(result).toBeNull();
		expect(mockLogger.log).toHaveBeenCalledWith(
			'Skipping dispute du_test456 - no payment_method_details (likely SEPA payment)',
		);
		expect(mockGetSubscription).not.toHaveBeenCalled();
	});
});
