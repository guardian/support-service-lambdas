import { getNextInvoiceItems } from '../src/billingPreview';
import { billingPreviewSchema } from '../src/zuoraSchemas';
import billingPreview from './fixtures/billing-preview-with-discount.json';

test('getNextPayment', () => {
	const parsedBillingPreview = billingPreviewSchema.parse(billingPreview);
	const nextInvoiceItems = getNextInvoiceItems(parsedBillingPreview);
	expect(nextInvoiceItems[0]?.serviceStartDate).toEqual(new Date('2023-12-19'));
	expect(nextInvoiceItems.length).toEqual(3);
});
