/* eslint-disable @typescript-eslint/no-unsafe-argument -- Test mocks require any type */
import type { ListenDisputeClosedRequestBody } from '../../src/dtos';
import { handleListenDisputeClosed } from '../../src/sqs-consumers/listenDisputeClosed';

const mockZuoraClient = {
	post: jest.fn(() => Promise.resolve({ Success: true })),
	put: jest.fn(() => Promise.resolve({ Success: true })),
};

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn(() => 'CODE'),
}));

jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: {
		create: jest.fn(() => Promise.resolve(mockZuoraClient)),
	},
}));

jest.mock('@modules/zuora/subscription', () => ({
	getSubscription: jest.fn(() =>
		Promise.resolve({ status: 'Active', subscriptionNumber: 'SUB-12345' }),
	),
	cancelSubscription: jest.fn(() => Promise.resolve({ Success: true })),
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

jest.mock('../../src/services/zuoraPaymentService', () => ({
	rejectPayment: jest.fn(() => Promise.resolve({ Success: true })),
}));

jest.mock('../../src/services/zuoraInvoiceService', () => ({
	writeOffInvoice: jest.fn(() => Promise.resolve({ Success: true })),
}));

const mockLogger = {
	log: jest.fn(),
	error: jest.fn(),
	mutableAddContext: jest.fn(),
} as any;

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
			// Get mocked functions
			const mockRejectPayment = jest.mocked(
				require('../../src/services/zuoraPaymentService').rejectPayment,
			);
			const mockWriteOffInvoice = jest.mocked(
				require('../../src/services/zuoraInvoiceService').writeOffInvoice,
			);
			const mockCancelSubscription = jest.mocked(
				require('@modules/zuora/subscription').cancelSubscription,
			);

			const result = await handleListenDisputeClosed(
				mockLogger,
				mockWebhookData,
				'du_test456',
			);

			expect(result.success).toBe(true);

			// Verify payment rejection service call
			expect(mockRejectPayment).toHaveBeenCalledWith(
				mockZuoraClient,
				'P-12345',
				'chargeback',
			);

			// Verify invoice write-off service call
			expect(mockWriteOffInvoice).toHaveBeenCalledWith(
				mockZuoraClient,
				'INV-12345',
				expect.stringContaining('Dispute ID: du_test456'),
			);

			// Verify subscription cancellation with EndOfLastInvoicePeriod
			expect(mockCancelSubscription).toHaveBeenCalledWith(
				mockZuoraClient,
				'SUB-12345',
				expect.any(Object), // dayjs date
				false, // runBilling
				undefined, // collect
				'EndOfLastInvoicePeriod', // cancellationPolicy
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
	});
});
