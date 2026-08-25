import dayjs from 'dayjs';
import { getInvoice } from '@modules/zuora/invoice';
import { createOrderAsynchronously } from '@modules/zuora/orders/asyncOrderRequests';
import {
	buildCancellationOrderRequest,
	cancelSubscriptionWithOrder,
	zeroOrOneInvoiceNumber,
} from '@modules/zuora/orders/cancelSubscription';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

jest.mock('@modules/zuora/invoice');
jest.mock('@modules/zuora/orders/asyncOrderRequests');

const input = {
	accountNumber: 'A01234567',
	subscriptionNumber: 'A-S01234567',
	orderDate: dayjs('2026-08-21'),
	cancellationEffectiveDate: dayjs('2026-08-21'),
};

describe('buildCancellationOrderRequest', () => {
	it('builds a billing cancellation order', () => {
		expect(buildCancellationOrderRequest(input)).toEqual({
			orderDate: '2026-08-21',
			existingAccountNumber: 'A01234567',
			subscriptions: [
				{
					subscriptionNumber: 'A-S01234567',
					orderActions: [
						{
							type: 'CancelSubscription',
							triggerDates: [
								{
									name: 'ContractEffective',
									triggerDate: '2026-08-21',
								},
							],
							cancelSubscription: {
								cancellationPolicy: 'SpecificDate',
								cancellationEffectiveDate: '2026-08-21',
							},
						},
					],
				},
			],
			processingOptions: {
				runBilling: true,
				collectPayment: false,
			},
		});
	});
});

describe('zeroOrOneInvoiceNumber', () => {
	it('returns the only invoice number', () => {
		expect(zeroOrOneInvoiceNumber(['INV-000001'])).toBe('INV-000001');
	});

	it.each([undefined, []])(
		'returns undefined when the cancellation does not generate an invoice',
		(invoiceNumbers) => {
			expect(zeroOrOneInvoiceNumber(invoiceNumbers)).toBeUndefined();
		},
	);

	it('rejects a cancellation order that generated multiple invoices', () => {
		expect(() => zeroOrOneInvoiceNumber(['INV-000001', 'INV-000002'])).toThrow(
			'more than one invoice for a single subscription cancellation',
		);
	});
});

describe('cancelSubscriptionWithOrder', () => {
	const zuoraClient = {} as ZuoraClient;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('looks up the invoice id returned by the completed order', async () => {
		jest.mocked(createOrderAsynchronously).mockResolvedValue({
			status: 'Completed',
			invoiceNumbers: ['INV-000001'],
		});
		jest.mocked(getInvoice).mockResolvedValue({
			id: '8a123',
			amount: -10,
			amountWithoutTax: -10,
			balance: -10,
			accountId: '8a456',
		});

		await expect(
			cancelSubscriptionWithOrder(
				zuoraClient,
				input,
				180_000,
				'stripe-dispute-cancellation-dp_123',
			),
		).resolves.toBe('8a123');

		expect(createOrderAsynchronously).toHaveBeenCalledWith(
			zuoraClient,
			buildCancellationOrderRequest(input),
			180_000,
			{ idempotencyKey: 'stripe-dispute-cancellation-dp_123' },
		);
		expect(getInvoice).toHaveBeenCalledWith(zuoraClient, 'INV-000001');
	});

	it('does not look up an invoice when the cancellation order does not generate one', async () => {
		jest.mocked(createOrderAsynchronously).mockResolvedValue({
			status: 'Completed',
		});

		await expect(
			cancelSubscriptionWithOrder(
				zuoraClient,
				input,
				180_000,
				'stripe-dispute-cancellation-dp_123',
			),
		).resolves.toBeUndefined();

		expect(getInvoice).not.toHaveBeenCalled();
	});
});
