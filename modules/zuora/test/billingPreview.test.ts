import {
	billingPreviewToSimpleInvoiceItems,
	getNextInvoiceTotal,
} from '../src/billingPreview';
import { billingPreviewSchema } from '../src/zuoraSchemas';
import billingPreview from './fixtures/billing-preview-with-discount.json';

test('getNextPayment', () => {
	const parsedBillingPreview = billingPreviewSchema.parse(billingPreview);
	const nextInvoiceItems = getNextInvoiceTotal(
		billingPreviewToSimpleInvoiceItems(parsedBillingPreview),
	);
	expect(nextInvoiceItems.date).toEqual(new Date('2023-12-19'));
	expect(nextInvoiceItems.total).toBeCloseTo(14.05);
});
