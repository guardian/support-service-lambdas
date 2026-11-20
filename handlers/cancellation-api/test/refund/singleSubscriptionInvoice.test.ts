import { PermanentError } from '../../src/refund/permanentError';
import { checkInvoiceOnlyForSubscription } from '../../src/refund/singleSubscriptionInvoice';
import { subscriptionInvoiceItemSchema } from '../../src/refund/subscriptionInvoiceItem';

const item = (Id: string) =>
	subscriptionInvoiceItemSchema.parse({
		Id,
		InvoiceId: 'inv1',
		ChargeDate: '2026-11-20T10:00:00.000Z',
		ChargeAmount: 100,
		TaxAmount: 0,
	});

const subscriptionInvoiceItems = [item('item1'), item('item2')];

test('passes when every invoice item belongs to the subscription', () => {
	expect(() =>
		checkInvoiceOnlyForSubscription({
			invoiceId: 'inv1',
			invoiceItemIds: ['item1', 'item2'],
			subscriptionInvoiceItems,
		}),
	).not.toThrow();
});

test('throws PermanentError when the invoice has items from another subscription, even if it nets to zero', () => {
	expect(() =>
		checkInvoiceOnlyForSubscription({
			invoiceId: 'inv1',
			invoiceItemIds: ['item1', 'item2', 'otherCharge', 'otherCredit'],
			subscriptionInvoiceItems,
		}),
	).toThrow(PermanentError);
});
