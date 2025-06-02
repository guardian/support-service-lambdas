import {
	toSimpleInvoiceItems,
	getNextInvoiceTotal,
	getNextNonFreePaymentDate,
	itemsForSubscription,
} from '../src/billingPreview';
import { billingPreviewSchema } from '../src/zuoraSchemas';
import billingPreview from './fixtures/billing-preview-with-discount.json';
import multiSubBillingPreview from './fixtures/multi-sub-billing-preview.json';

test('getNextPayment', () => {
	const invoiceItems = toSimpleInvoiceItems(
		itemsForSubscription('A-S00711320')(
			billingPreviewSchema.parse(billingPreview),
		),
	);
	const nextInvoiceTotal = getNextInvoiceTotal(invoiceItems);
	const nextInvoiceDate = getNextNonFreePaymentDate(invoiceItems);
	expect(nextInvoiceDate).toEqual(new Date('2023-12-19'));
	expect(nextInvoiceTotal).toBeCloseTo(14.05);
});

test('voucher filtered out by itemsForSubscription when you have voucher and contribution on the same zuora account even if the voucher will be paid first', () => {
	const invoiceItems = toSimpleInvoiceItems(
		itemsForSubscription('A-1112223')(
			billingPreviewSchema.parse(multiSubBillingPreview),
		),
	);
	const nextInvoiceTotal = getNextInvoiceTotal(invoiceItems);
	const nextInvoiceDate = getNextNonFreePaymentDate(invoiceItems);
	expect(nextInvoiceDate).toEqual(new Date('2025-06-18'));
	expect(nextInvoiceTotal).toBeCloseTo(2);
});
