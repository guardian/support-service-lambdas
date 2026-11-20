import { PermanentError } from '../../src/refund/permanentError';
import { checkInvoiceOnlyForSubscription } from '../../src/refund/singleSubscriptionInvoice';
import { subscriptionInvoiceItemSchema } from '../../src/refund/subscriptionInvoiceItem';

const item = (InvoiceId: string, ChargeAmount: number, TaxAmount = 0) =>
	subscriptionInvoiceItemSchema.parse({
		Id: `${InvoiceId}-${ChargeAmount}`,
		InvoiceId,
		ChargeDate: '2026-11-20T10:00:00.000Z',
		ChargeAmount,
		TaxAmount,
	});

const subscriptionInvoiceItems = [item('inv1', 90, 10), item('inv2', -100)];

test('passes when the subscription has every charge on the invoice', () => {
	expect(() =>
		checkInvoiceOnlyForSubscription({
			invoiceId: 'inv1',
			invoiceAmountPence: 10000,
			subscriptionInvoiceItems,
		}),
	).not.toThrow();
});

test('throws PermanentError when the invoice includes another subscription', () => {
	expect(() =>
		checkInvoiceOnlyForSubscription({
			invoiceId: 'inv2',
			invoiceAmountPence: 5000,
			subscriptionInvoiceItems,
		}),
	).toThrow(PermanentError);
});

test('throws PermanentError when the invoice has none of the subscription charges', () => {
	expect(() =>
		checkInvoiceOnlyForSubscription({
			invoiceId: 'inv3',
			invoiceAmountPence: 15000,
			subscriptionInvoiceItems,
		}),
	).toThrow(PermanentError);
});
