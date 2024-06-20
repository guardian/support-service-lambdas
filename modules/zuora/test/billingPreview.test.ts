import {
	billingPreviewToSimpleInvoiceItems,
	getNextInvoiceTotal,
	getNextNonFreePaymentDate,
} from '../src/billingPreview';
import { billingPreviewSchema } from '../src/zuoraSchemas';
import billingPreview from './fixtures/billing-preview-with-discount.json';

test('getNextPayment', () => {
	const invoiceItems = billingPreviewToSimpleInvoiceItems(
		billingPreviewSchema.parse(billingPreview),
	);
	const nextInvoiceTotal = getNextInvoiceTotal(invoiceItems);
	const nextInvoiceDate = getNextNonFreePaymentDate(invoiceItems);
	expect(nextInvoiceDate).toEqual(new Date('2023-12-19'));
	expect(nextInvoiceTotal).toBeCloseTo(14.05);
});
