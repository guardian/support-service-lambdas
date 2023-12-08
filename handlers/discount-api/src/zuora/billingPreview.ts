import type { Dayjs } from 'dayjs';
import { groupBy } from '../arrayFunctions';
import { checkDefined } from '../nullAndUndefined';
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

export const getNextInvoiceItems = (
	billingPreview: BillingPreview,
): InvoiceItem[] => {
	const sorted = billingPreview.invoiceItems.sort((a, b) => {
		return a.serviceStartDate < b.serviceStartDate ? -1 : 1;
	});
	const nextInvoiceDate = checkDefined(
		sorted[0]?.serviceStartDate.toISOString(),
		'No invoice items found in response from Zuora',
	);

	const groupedInvoiceItems = groupBy(billingPreview.invoiceItems, (item) =>
		item.serviceStartDate.toISOString(),
	);
	const nextInvoiceItems = checkDefined(
		groupedInvoiceItems[nextInvoiceDate],
		'No invoice items found for next invoice date',
	);

	return [...nextInvoiceItems];
};
