import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraGetInvoiceFromStripeChargeId } from '../../src/services/zuoraGetInvoiceFromStripeChargeId';

// Mock the doQuery function
jest.mock('@modules/zuora/query', () => ({
	doQuery: jest.fn(),
}));

describe('zuoraGetInvoiceFromStripeChargeId', () => {
	const mockZuoraClient: ZuoraClient = {} as any;
	const { doQuery } = require('@modules/zuora/query');

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should successfully retrieve invoice data from stripe charge id', async () => {
		// Mock payment query response
		doQuery
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'payment-123',
						Status: 'Processed',
						PaymentNumber: 'P-001',
						AccountId: 'account-123',
						ReferenceId: 'ch_stripe123',
					},
				],
			})
			// Mock invoice payment query response
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'invoice-payment-123',
						InvoiceId: 'invoice-123',
					},
				],
			})
			// Mock invoice items query response
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'invoice-item-123',
						SubscriptionId: 'subscription-123',
						SubscriptionNumber: 'SUB-001',
					},
				],
			});

		const result = await zuoraGetInvoiceFromStripeChargeId(
			'ch_stripe123',
			mockZuoraClient,
		);

		expect(doQuery).toHaveBeenCalledTimes(3);

		// Verify payment query
		expect(doQuery).toHaveBeenNthCalledWith(
			1,
			mockZuoraClient,
			"SELECT id, referenceid, paymentnumber, status, accountid FROM Payment WHERE ReferenceID = 'ch_stripe123' LIMIT 1",
			expect.any(Object),
		);

		// Verify invoice payment query
		expect(doQuery).toHaveBeenNthCalledWith(
			2,
			mockZuoraClient,
			"SELECT invoiceid FROM InvoicePayment WHERE PaymentID = 'payment-123'",
			expect.any(Object),
		);

		// Verify invoice items query
		expect(doQuery).toHaveBeenNthCalledWith(
			3,
			mockZuoraClient,
			"SELECT Id, SubscriptionId, SubscriptionNumber FROM InvoiceItem WHERE InvoiceId = 'invoice-123'",
			expect.any(Object),
		);

		expect(result).toEqual({
			paymentId: 'payment-123',
			paymentStatus: 'Processed',
			paymentPaymentNumber: 'P-001',
			paymentAccountId: 'account-123',
			paymentReferenceId: 'ch_stripe123',
			InvoiceId: 'invoice-123',
			paymentsInvoiceId: 'invoice-payment-123',
			subscriptionId: 'subscription-123',
			SubscriptionNumber: 'SUB-001',
		});
	});

	it('should throw error when no payment found', async () => {
		doQuery.mockResolvedValueOnce({
			records: [],
		});

		await expect(
			zuoraGetInvoiceFromStripeChargeId('ch_nonexistent', mockZuoraClient),
		).rejects.toThrow(
			"No payment found in Zuora with ReferenceID = 'ch_nonexistent'",
		);

		expect(doQuery).toHaveBeenCalledTimes(1);
	});

	it('should throw error when payment record is undefined', async () => {
		doQuery.mockResolvedValueOnce({
			records: [undefined],
		});

		await expect(
			zuoraGetInvoiceFromStripeChargeId('ch_stripe123', mockZuoraClient),
		).rejects.toThrow('Payment found but record is undefined');
	});

	it('should throw error when no invoice payments found', async () => {
		doQuery
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'payment-123',
						Status: 'Processed',
						PaymentNumber: 'P-001',
						AccountId: 'account-123',
						ReferenceId: 'ch_stripe123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [],
			});

		await expect(
			zuoraGetInvoiceFromStripeChargeId('ch_stripe123', mockZuoraClient),
		).rejects.toThrow(
			"No paymentsInvoices found in Zuora with ReferenceID = 'payment-123'",
		);

		expect(doQuery).toHaveBeenCalledTimes(2);
	});

	it('should throw error when invoice payment record is undefined', async () => {
		doQuery
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'payment-123',
						Status: 'Processed',
						PaymentNumber: 'P-001',
						AccountId: 'account-123',
						ReferenceId: 'ch_stripe123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [undefined],
			});

		await expect(
			zuoraGetInvoiceFromStripeChargeId('ch_stripe123', mockZuoraClient),
		).rejects.toThrow('paymentsInvoices found but record is undefined');
	});

	it('should throw error when no invoice items found', async () => {
		doQuery
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'payment-123',
						Status: 'Processed',
						PaymentNumber: 'P-001',
						AccountId: 'account-123',
						ReferenceId: 'ch_stripe123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'invoice-payment-123',
						InvoiceId: 'invoice-123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [],
			});

		await expect(
			zuoraGetInvoiceFromStripeChargeId('ch_stripe123', mockZuoraClient),
		).rejects.toThrow(
			"No invoicesItems found in Zuora with ReferenceID = 'invoice-123'",
		);

		expect(doQuery).toHaveBeenCalledTimes(3);
	});

	it('should throw error when invoice item record is undefined', async () => {
		doQuery
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'payment-123',
						Status: 'Processed',
						PaymentNumber: 'P-001',
						AccountId: 'account-123',
						ReferenceId: 'ch_stripe123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'invoice-payment-123',
						InvoiceId: 'invoice-123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [undefined],
			});

		await expect(
			zuoraGetInvoiceFromStripeChargeId('ch_stripe123', mockZuoraClient),
		).rejects.toThrow('invoicesItems found but record is undefined');
	});

	it('should handle database query errors properly', async () => {
		doQuery.mockRejectedValueOnce(new Error('Database connection failed'));

		await expect(
			zuoraGetInvoiceFromStripeChargeId('ch_stripe123', mockZuoraClient),
		).rejects.toThrow('Database connection failed');

		expect(doQuery).toHaveBeenCalledTimes(1);
	});

	it('should filter invoice items and throw error when no item has subscription', async () => {
		doQuery
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'payment-123',
						Status: 'Processed',
						PaymentNumber: 'P-001',
						AccountId: 'account-123',
						ReferenceId: 'ch_stripe123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'invoice-payment-123',
						InvoiceId: 'invoice-123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'invoice-item-123',
						SubscriptionId: null,
						SubscriptionNumber: null,
					},
					{
						Id: 'invoice-item-124',
						SubscriptionId: null,
						SubscriptionNumber: null,
					},
				],
			});

		await expect(
			zuoraGetInvoiceFromStripeChargeId('ch_stripe123', mockZuoraClient),
		).rejects.toThrow('No invoice item with a subscription found');

		expect(doQuery).toHaveBeenCalledTimes(3);
	});

	it('should successfully filter and find invoice item with subscription', async () => {
		doQuery
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'payment-123',
						Status: 'Processed',
						PaymentNumber: 'P-001',
						AccountId: 'account-123',
						ReferenceId: 'ch_stripe123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'invoice-payment-123',
						InvoiceId: 'invoice-123',
					},
				],
			})
			.mockResolvedValueOnce({
				records: [
					{
						Id: 'invoice-item-123',
						SubscriptionId: null,
						SubscriptionNumber: null,
					},
					{
						Id: 'invoice-item-124',
						SubscriptionId: 'subscription-456',
						SubscriptionNumber: 'SUB-002',
					},
				],
			});

		const result = await zuoraGetInvoiceFromStripeChargeId(
			'ch_stripe123',
			mockZuoraClient,
		);

		expect(result).toEqual({
			paymentId: 'payment-123',
			paymentStatus: 'Processed',
			paymentPaymentNumber: 'P-001',
			paymentAccountId: 'account-123',
			paymentReferenceId: 'ch_stripe123',
			InvoiceId: 'invoice-123',
			paymentsInvoiceId: 'invoice-payment-123',
			subscriptionId: 'subscription-456',
			SubscriptionNumber: 'SUB-002',
		});
	});
});
