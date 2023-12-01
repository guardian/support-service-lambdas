import { getNextInvoice } from '../src/zuora/billingPreview';
import { billingPreviewSchema } from '../src/zuora/zuoraSchemas';
import billingPreview from './fixtures/billing-preview.json';

test('getNextPayment', () => {
	const parsedBillingPreview = billingPreviewSchema.parse(billingPreview);
	const nextInvoice = getNextInvoice(parsedBillingPreview);
	expect(nextInvoice?.serviceStartDate).toEqual(new Date('2023-12-17'));
});
