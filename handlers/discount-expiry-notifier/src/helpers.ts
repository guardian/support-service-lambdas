import type { BillingPreviewInvoiceItem } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';

export const calculateTotalAmount = (records: BillingPreviewInvoiceItem[]) => {
	return records.reduce(
		(total, record) => total + record.chargeAmount + record.taxAmount,
		0,
	);
};

export const filterRecords = (
	invoiceItems: BillingPreviewInvoiceItem[],
	subscriptionNumber: string,
	firstPaymentDateAfterDiscountExpiry: string,
): BillingPreviewInvoiceItem[] => {
	return invoiceItems.filter(
		(item) =>
			item.subscriptionNumber === subscriptionNumber &&
			dayjs(item.serviceStartDate).isSame(
				dayjs(firstPaymentDateAfterDiscountExpiry),
				'day',
			),
	);
};
