import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from './common';
import type { ZuoraClient } from './zuoraClient';
import type { BillingPreview, InvoiceItem } from './zuoraSchemas';
import { billingPreviewSchema } from './zuoraSchemas';

export const getBillingPreview = async (
	zuoraClient: ZuoraClient,
	targetDate: Dayjs,
	accountNumber: string,
): Promise<BillingPreview> => {
	const path = `v1/operations/billing-preview`;

	const body = JSON.stringify({
		accountNumber,
		targetDate: zuoraDateFormat(targetDate),
		assumeRenewal: 'Autorenew',
	});
	return zuoraClient.post<BillingPreview>(path, body, billingPreviewSchema);
};

export const getNextInvoice = (
	billingPreview: BillingPreview,
): InvoiceItem | undefined => {
	const nextInvoice = billingPreview.invoiceItems.sort((a, b) => {
		return a.serviceStartDate < b.serviceStartDate ? -1 : 1;
	})[0];
	return nextInvoice;
};
